// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Main logic for the "Quibbles" GNOME Shell Extension.
 * This file acts as a "manager" that loads and controls
 * all the individual features of the extension.
 */

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// --- User Session Features ---
import { MouseBarrierFeature } from './mouseBarrier.js';
import { ActivitiesButtonFeature } from './activitiesButton.js';
import { WindowMenuFeature } from './windowMenu.js';
import { WorkspaceIndicatorFeature } from './workspaceIndicator.js';
import { ScreenshotButtonModule } from './screenshotButton.js';
import { SystemMenuModule } from './systemMenu.js';

// --- Lock Screen Features ---
import LockscreenClock from './lockscreenClock.js';
import LockscreenUnblank from './lockscreenUnblank.js';

// --- Main Extension Class ---
export default class QuibblesExtension extends Extension {
    
    constructor(metadata) {
        super(metadata);
        
        // --- Properties for User Session ---
        this._settings = null;
        this._barrierFeature = null;
        this._activitiesFeature = null;
        this._windowMenuFeature = null;
        this._indicatorFeature = null;
        this._screenshotButtonFeature = null;
        this._systemMenuFeature = null;

        // --- Properties for Lock Screen ---
        this._lockSettings = null; 
        this._clockModule = null;
        this._unblankModule = null;
        this._unblankToggleSignalId = null; 
        
        // --- Session Management ---
        this._sessionId = null;
    }


    // --- State Enable/Disable Functions ---

    /**
     * Enables all features that run in the user session.
     */
    _enableUserSession() {
        this._settings = this.getSettings();
        
        try {
            this._barrierFeature = new MouseBarrierFeature(this._settings);
            this._barrierFeature.enable();
        } catch(e) { }
        
        try {
            this._activitiesFeature = new ActivitiesButtonFeature(this._settings);
            this._activitiesFeature.enable();
        } catch(e) { }
        
        try {
            this._windowMenuFeature = new WindowMenuFeature(this._settings);
            this._windowMenuFeature.enable();
        } catch(e) { }

        try {
            this._indicatorFeature = new WorkspaceIndicatorFeature(this._settings);
            this._indicatorFeature.enable();
        } catch(e) { }
        
        try {
            this._screenshotButtonFeature = new ScreenshotButtonModule(this._settings);
            this._screenshotButtonFeature.enable();
        } catch(e) { }
        
        try {
            this._systemMenuFeature = new SystemMenuModule(this._settings);
            this._systemMenuFeature.enable();
        } catch(e) { }
    }

    /**
     * Disables all features that run in the user session.
     */
    _disableUserSession() {
        if (this._barrierFeature) {
            this._barrierFeature.disable();
            this._barrierFeature = null;
        }
        
        if (this._activitiesFeature) {
            this._activitiesFeature.disable();
            this._activitiesFeature = null;
        }
        
        if (this._windowMenuFeature) {
            this._windowMenuFeature.disable();
            this._windowMenuFeature = null;
        }
        
        if (this._indicatorFeature) {
            this._indicatorFeature.disable();
            this._indicatorFeature = null;
        }
        
        if (this._screenshotButtonFeature) {
            this._screenshotButtonFeature.disable();
            this._screenshotButtonFeature = null;
        }
        
        if (this._systemMenuFeature) {
            this._systemMenuFeature.disable();
            this._systemMenuFeature = null;
        }
        
        this._settings?.run_dispose();
        this._settings = null;
    }
    
    /**
     * Enables all features that run on the lock screen.
     */
    _enableLockScreen() {
        this._lockSettings = this.getSettings();

        try {
            this._clockModule = new LockscreenClock(this._lockSettings);
            this._clockModule.enable();
        } catch(e) { }

        try {
            this._unblankModule = new LockscreenUnblank(this._lockSettings);
            
            this._unblankToggleSignalId = this._lockSettings.connect(
                'changed::enable-unblank',
                () => this._onUnblankToggleChanged()
            );
            
            this._onUnblankToggleChanged();
        } catch(e) { }
    }
    
    /**
     * Disables all features that run on the lock screen.
     */
    _disableLockScreen() {
        if (this._clockModule) {
            this._clockModule.disable();
            this._clockModule = null;
        }

        if (this._unblankToggleSignalId) {
            this._lockSettings.disconnect(this._unblankToggleSignalId);
            this._unblankToggleSignalId = null;
        }
        
        if (this._unblankModule) {
            this._unblankModule.disable();
            this._unblankModule = null;
        }
        
        this._lockSettings?.run_dispose();
        this._lockSettings = null;
    }

    /**
     * Signal handler for the 'enable-unblank' setting.
     */
    _onUnblankToggleChanged() {
        if (!this._lockSettings || !this._unblankModule) return;
        
        const shouldEnable = this._lockSettings.get_boolean('enable-unblank');
        
        if (shouldEnable) {
            this._unblankModule.enable();
        } else {
            this._unblankModule.disable();
        }
    }


    // --- Session Mode Switching Logic ---
    _onSessionModeChanged(session) {
        const currentMode = session.currentMode;
        
        if (currentMode === 'unlock-dialog' || currentMode === 'gdm') {
            this._disableUserSession();
            this._enableLockScreen();
        } else if (currentMode === 'user') {
            this._disableLockScreen();
            this._enableUserSession();
        }
    }

    // --- Main Entry/Exit Points ---
    enable() {
        this._sessionId = Main.sessionMode.connect('updated',
            this._onSessionModeChanged.bind(this));
        
        // Run once to set the correct initial state
        this._onSessionModeChanged(Main.sessionMode);
    }

    disable() {
        // This extension uses 'unlock-dialog' session mode to modify the lock screen
        // clock font. All UI elements and listeners are cleaned up here.
        if (this._sessionId) {
            Main.sessionMode.disconnect(this._sessionId);
            this._sessionId = null;
        }

        // Clean up both states
        this._disableLockScreen();
        this._disableUserSession();
    }
}

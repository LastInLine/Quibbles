// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Main logic for the "Quibbles" GNOME Shell Extension.
 */

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// --- User Session Features ---
import { MouseBarrierFeature } from './modules/mouseBarrier.js';
import { ActivitiesButtonFeature } from './modules/activitiesButton.js';
import { WindowMenuFeature } from './modules/windowMenu.js';
import { WorkspaceIndicatorFeature } from './modules/workspaceIndicator.js';
import { ScreenshotButtonModule } from './modules/screenshotButton.js';
import { SystemMenuModule } from './modules/systemMenu.js';

// --- Lock Screen Features ---
import LockscreenClock from './modules/lockscreenClock.js';
import LockscreenUnblank from './modules/lockscreenUnblank.js';

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
        this._windowMenuToggleSignalId = null; // <-- NEW

        // --- Properties for Lock Screen ---
        this._lockSettings = null; 
        this._clockModule = null;
        this._unblankModule = null;
        this._unblankToggleSignalId = null; 
        
        // --- Session Management ---
        this._sessionId = null;
    }

    // --- Lock Screen Handlers ---

    _enableLockScreen() {
        // Get settings just for the lockscreen features.
        this._lockSettings = this.getSettings();

        // Enable clock
        if (!this._clockModule) {
            this._clockModule = new LockscreenClock();
            this._clockModule.enable(this._lockSettings);
        }

        // Connect to the master toggle for the unblank feature
        this._unblankToggleSignalId = this._lockSettings.connect( //
            'changed::enable-unblank',
            () => this._checkUnblankState()
        );
        
        // Run the check once to set the initial state
        this._checkUnblankState();
    }

    /**
     * Checks the 'enable-unblank' setting and enables/disables
     * the unblank module as needed.
     */
    _checkUnblankState() {
        if (this._lockSettings.get_boolean('enable-unblank')) {
            // Setting is ON, so enable the module if it's not already
            if (!this._unblankModule) {
                this._unblankModule = new LockscreenUnblank();
                this._unblankModule.enable(this._lockSettings);
            }
        } else {
            // Setting is OFF, so disable the module if it's running
            if (this._unblankModule) {
                this._unblankModule.disable();
                this._unblankModule = null;
            }
        }
    }

    _disableLockScreen() {
        // Disconnect the signal handler
        if (this._unblankToggleSignalId) {
            this._lockSettings.disconnect(this._unblankToggleSignalId);
            this._unblankToggleSignalId = null;
        }

        // Disable clock
        if (this._clockModule) {
            this._clockModule.disable();
            this._clockModule = null;
        }

        // Disable unblank
        if (this._unblankModule) {
            this._unblankModule.disable();
            this._unblankModule = null;
        }
        
        // Clean up the lockscreen settings object
        this._lockSettings?.run_dispose();
        this._lockSettings = null;
    }
    
    /**
     * Checks the 'enable-window-menu' setting and enables/disables
     * the window menu module as needed.
     */
    _checkWindowMenuState() {
        if (this._settings.get_boolean('enable-window-menu')) {
            if (!this._windowMenuFeature) {
                try {
                    this._windowMenuFeature = new WindowMenuFeature(this._settings);
                    this._windowMenuFeature.enable();
                } catch(e) { console.error(`Quibbles: Failed to enable WindowMenuFeature: ${e}`); }
            }
        } else {
            if (this._windowMenuFeature) {
                this._windowMenuFeature.disable();
                this._windowMenuFeature = null;
            }
        }
    }

    // --- User Session Handlers ---
    _enableUserSession() {
        if (this._settings) return; // Already enabled

        this._settings = this.getSettings();
        
        try {
            this._barrierFeature = new MouseBarrierFeature(this._settings);
            this._barrierFeature.enable();
        } catch(e) { /* Fail silently */ }

        try {
            this._activitiesFeature = new ActivitiesButtonFeature(this._settings);
            this._activitiesFeature.enable();
        } catch(e) { /* Fail silently */ }

        this._windowMenuToggleSignalId = this._settings.connect(
            'changed::enable-window-menu',
            () => this._checkWindowMenuState()
        );

        this._checkWindowMenuState();

        try {
            this._indicatorFeature = new WorkspaceIndicatorFeature(this._settings);
            this._indicatorFeature.enable();
        } catch(e) { /* Fail silently */ }

        try {
            this._screenshotButtonFeature = new ScreenshotButtonModule(this._settings);
            this._screenshotButtonFeature.enable();
        } catch(e) { /* Fail silently */ }
        
        try {
            this._systemMenuFeature = new SystemMenuModule(this._settings);
            this._systemMenuFeature.enable();
        } catch(e) { /* Fail silently */ }
    }

    _disableUserSession() {
        if (!this._settings) return; // Already disabled

        if (this._barrierFeature) {
            this._barrierFeature.disable();
            this._barrierFeature = null;
        }

        if (this._activitiesFeature) {
            this._activitiesFeature.disable();
            this._activitiesFeature = null;
        }

        if (this._windowMenuToggleSignalId) {
            this._settings.disconnect(this._windowMenuToggleSignalId);
            this._windowMenuToggleSignalId = null;
        }
        if (this._windowMenuFeature) { //
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


    // --- Session Mode Switching Logic ---
    _onSessionModeChanged(session) {
        if (session.currentMode === 'unlock-dialog') {
            // We are on the lock screen
            this._disableUserSession();
            this._enableLockScreen();
        } else {
            // We are in the user session
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

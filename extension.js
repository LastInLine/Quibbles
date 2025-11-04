// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Main logic for the "Quibbles" GNOME Shell Extension.
 *
 * 1. Stable features are loaded once in the main enable() and disable() functions
 * 2. Volatile features are handled by the session-mode functions
 * 3. Lock-screen-only features are handled by the session-mode functions
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
        // Stable features
        this._windowMenuFeature = null;
        this._screenshotButtonFeature = null;
        // Volatile features
        this._barrierFeature = null; 
        this._activitiesFeature = null;
        this._indicatorFeature = null;
        this._systemMenuFeature = null;

        // --- Properties for Lock Screen ---
        this._lockSettings = null; 
        this._clockModule = null;
        this._unblankModule = null;
        this._unblankToggleSignalId = null; 
        
        // --- Session Management ---
        this._sessionId = null;
        this._isStartup = true; // Tracks the first run
        this._unlockDialog = null;
        this._unlockDialogDestroyId = null;
    }

    // --- Lock Screen Handlers ---

    _enableLockScreen() {
        this._lockSettings = this.getSettings();

        if (!this._clockModule) {
            this._clockModule = new LockscreenClock();
            this._clockModule.enable(this._lockSettings);
        }

        this._unblankToggleSignalId = this._lockSettings.connect(
            'changed::enable-unblank',
            () => this._checkUnblankState()
        );
        this._checkUnblankState();
    }

    _checkUnblankState() {
        if (this._lockSettings.get_boolean('enable-unblank')) {
            if (!this._unblankModule) {
                this._unblankModule = new LockscreenUnblank();
                this._unblankModule.enable(this._lockSettings);
            }
        } else {
            if (this._unblankModule) {
                this._unblankModule.disable();
                this._unblankModule = null;
            }
        }
    }

    _disableLockScreen() {
        // Clean up destroy signal handler
        if (this._unlockDialog && this._unlockDialogDestroyId) {
            this._unlockDialog.disconnect(this._unlockDialogDestroyId);
            this._unlockDialogDestroyId = null;
            this._unlockDialog = null;
        }
        
        if (this._unblankToggleSignalId) {
            this._lockSettings.disconnect(this._unblankToggleSignalId);
            this._unblankToggleSignalId = null;
        }
        
        if (this._clockModule) {
            this._clockModule.disable();
            this._clockModule = null;
        }
        
        if (this._unblankModule) {
            this._unblankModule.disable();
            this._unblankModule = null;
        }
        
        this._lockSettings?.run_dispose();
        this._lockSettings = null;
    }

    // --- User Session Handlers ---

    _enableUserSession(isStartup = false) {
        if (!this._settings) return;

        try {
            this._barrierFeature = new MouseBarrierFeature(this._settings);
            this._barrierFeature.enable(isStartup);
        } catch(e) { /* Fail silently */ }

        try {
            this._activitiesFeature = new ActivitiesButtonFeature(this._settings);
            this._activitiesFeature.enable(isStartup);
        } catch(e) { /* Fail silently */ }

        try {
            this._systemMenuFeature = new SystemMenuModule(this._settings);
            this._systemMenuFeature.enable(isStartup);
        } catch(e) { /* Fail silently */ }

        try {
            this._indicatorFeature = new WorkspaceIndicatorFeature(this._settings);
            this._indicatorFeature.enable(isStartup);
        } catch(e) { /* Fail silently */ }
    }

    _disableUserSession() {
        if (this._barrierFeature) {
            this._barrierFeature.disable();
            this._barrierFeature = null;
        }

        if (this._activitiesFeature) {
            this._activitiesFeature.disable();
            this._activitiesFeature = null;
        }

        if (this._systemMenuFeature) {
            this._systemMenuFeature.disable();
            this._systemMenuFeature = null;
        }

        if (this._indicatorFeature) {
            this._indicatorFeature.disable();
            this._indicatorFeature = null;
        }
    }

    // --- Session Mode Switching Logic ---
    
    _onSessionModeChanged(session) {
        if (session.currentMode === 'unlock-dialog') {
            // We are ON the lock screen
            this._disableUserSession();
            this._enableLockScreen();

            // Connect to the unlock dialog's destroy signal
            this._unlockDialog = Main.screenShield._unlockDialog;
            if (this._unlockDialog && !this._unlockDialogDestroyId) {
                this._unlockDialogDestroyId = this._unlockDialog.connect('destroy', () => {
                    this._disableLockScreen();
                    this._unlockDialog = null;
                    this._unlockDialogDestroyId = null;
                });
            }

        } else {
            // We are IN the user session
            if (this._clockModule || this._unblankModule) {
                this._disableLockScreen();
            }
            
            this._enableUserSession(this._isStartup);
            this._isStartup = false;
        }
    }
    
    // --- Main Entry/Exit Points ---

    enable() {
        this._settings = this.getSettings();
        this._isStartup = true; // Reset startup flag on every enable

        // Load all stable features once
        try {
            this._windowMenuFeature = new WindowMenuFeature(this._settings);
            this._windowMenuFeature.enable();
        } catch(e) { /* Fail silently */ }

        try {
            this._screenshotButtonFeature = new ScreenshotButtonModule(this._settings);
            this._screenshotButtonFeature.enable();
        } catch(e) { /* Fail silently */ }
        
        // Connect the session mode handler
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

        // Clean up session-managed states
        this._disableLockScreen();
        this._disableUserSession();

        // Clean up stable features
        if (this._windowMenuFeature) {
            this._windowMenuFeature.disable();
            this._windowMenuFeature = null;
        }
        
        if (this._screenshotButtonFeature) {
            this._screenshotButtonFeature.disable();
            this._screenshotButtonFeature = null;
        }

        // Clean up settings object
        this._settings?.run_dispose();
        this._settings = null;
    }
}

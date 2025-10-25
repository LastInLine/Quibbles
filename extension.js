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
        this._unblankToggleSignalId = this._lockSettings.connect(
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

    // --- User Session Handlers ---
    _enableUserSession() {
        if (this._settings) return; // Already enabled

        this._settings = this.getSettings();
        
        this._barrierFeature = new MouseBarrierFeature(this._settings);
        this._barrierFeature.enable();

        this._activitiesFeature = new ActivitiesButtonFeature(this._settings);
        this._activitiesFeature.enable();

        this._windowMenuFeature = new WindowMenuFeature(this._settings);
        this._windowMenuFeature.enable();

        this._indicatorFeature = new WorkspaceIndicatorFeature(this._settings);
        this._indicatorFeature.enable();
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

        if (this._windowMenuFeature) {
            this._windowMenuFeature.disable();
            this._windowMenuFeature = null;
        }

        if (this._indicatorFeature) {
            this._indicatorFeature.disable();
            this._indicatorFeature = null;
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



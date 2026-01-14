// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
// User Session Features
import { ActivitiesButtonFeature } from './modules/activitiesButton.js';
import { ClockWeatherFeature } from './modules/clockWeather.js';
import { EventHandler } from './modules/eventHandler.js';
import { MouseBarrierFeature } from './modules/mouseBarrier.js';
import { ScreenshotButtonModule } from './modules/screenshotButton.js';
import { SystemMenuModule } from './modules/systemMenu.js';
import { WindowMenuFeature } from './modules/windowMenu.js';
import { WorkspaceIndicatorFeature } from './modules/workspaceIndicator.js';
// Lock Screen Features
import LockscreenClock from './modules/lockscreenClock.js';
import LockscreenFix from './modules/lockscreenFix.js';
import LockscreenTimeoutFeature from './modules/lockscreenTimeout.js';

export default class QuibblesExtension extends Extension {
    
    constructor(metadata) {
        super(metadata);
        
        this._settings = null;
        this._sessionId = null;
        this._windowMenuManager = null;
        this._userModules = [];
        this._lockModules = []; 
    }
    
    // ----------------------------
    // --- Lock Screen Handlers ---
    // ----------------------------

    _enableLockScreen() {
        if (this._settings.get_boolean('clock-enabled')) {
            const clock = new LockscreenClock();
            clock.enable(this._settings);
            this._lockModules.push(clock);
        }
        
        if (this._settings.get_boolean('enable-timeout')) {
            const timeout = new LockscreenTimeoutFeature();
            timeout.enable(this._settings);
            this._lockModules.push(timeout);
        }

        if (this._settings.get_boolean('fix-lockscreen-black-screen')) {
            const fix = new LockscreenFix(this._settings);
            fix.enable();
            this._lockModules.push(fix);
        }
    }

    _disableLockScreen() {
        this._lockModules.forEach(module => module.disable());
        this._lockModules = [];
    }
    
    // -----------------------------
    // --- User Session Handlers ---
    // -----------------------------

    _enableUserSession() {
        if (!this._settings) return;
        
        const ModuleClasses = [
            ActivitiesButtonFeature,
            MouseBarrierFeature,
            ClockWeatherFeature,
            EventHandler,
            WorkspaceIndicatorFeature,
            SystemMenuModule,
            ScreenshotButtonModule 
        ];

        ModuleClasses.forEach(ModuleClass => {
            const instance = new ModuleClass(this._settings);
            this._userModules.push(instance);
            instance.enable();
        });
    }

    _disableUserSession() {
        this._userModules.forEach(module => module.disable());
        this._userModules = [];
    }
    
    // ------------------------------------
    // --- Session Mode Switching Logic ---
    // ------------------------------------
    
    _onSessionModeChanged(session) {
        if (session.currentMode === 'unlock-dialog') {
            this._disableUserSession();
            this._enableLockScreen();
            
        } else {
            this._disableLockScreen();
            this._enableUserSession();
        }
    }

    // ------------------------------    
    // --- Main Entry/Exit Points ---
    // ------------------------------

    enable() {
        this._settings = this.getSettings();
        
        this._windowMenuManager = new WindowMenuFeature(this._settings);
        this._windowMenuManager.enable();
        
        this._sessionId = Main.sessionMode.connect('updated',
            this._onSessionModeChanged.bind(this));

        this._onSessionModeChanged(Main.sessionMode);
    }

    disable() {
    
        /** 
         * This comment is required per EGO guidelines:
         * This extension uses 'unlock-dialog' session mode to modify the lockscreen
         * clock and force load the wallpaper to fix the bug where the wallpaper doesn't
         * always load in multi-monitor setups. All UI elements and listeners are cleaned up here.
         */
         
        if (this._sessionId) {
            Main.sessionMode.disconnect(this._sessionId);
            this._sessionId = null;
        }

        this._disableLockScreen();
        this._disableUserSession();

        if (this._windowMenuManager) {
            this._windowMenuManager.disable();
            this._windowMenuManager = null;
        }

        this._settings = null;
    }
}

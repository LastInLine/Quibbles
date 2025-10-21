/**
 * Main logic for the "Quibbles" GNOME Shell Extension.
 * This file acts as a "manager" that loads and controls
 * all the individual features of the extension.
 */

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
// All other 'resource:///' and 'gi://' imports have been
// moved to their respective feature files.

// Import our separated features
import { MouseBarrierFeature } from './mouseBarrier.js';
import { ActivitiesButtonFeature } from './activitiesButton.js';
import { WindowMenuFeature } from './windowMenu.js';
import { WorkspaceIndicatorFeature } from './workspaceIndicator.js';


// --- Main Extension Class ---
export default class QuibblesExtension extends Extension {
    /**
     * The constructor is called once when the extension is loaded.
     * It initializes all the properties that will be used by the extension.
     */
    constructor(metadata) {
        super(metadata);
        
        this._settings = null;

        // Properties to hold our feature instances
        this._barrierFeature = null;
        this._activitiesFeature = null;
        this._windowMenuFeature = null;
        this._indicatorFeature = null;
    }

    /**
     * The main entry point. Called when the extension is enabled by the user,
     * at login, or after the lock screen.
     */
    enable() {
        this._settings = this.getSettings();
        
        // --- Initialize all our features ---
        // Each feature is passed the settings object so it can
        // connect to its own settings.

        this._barrierFeature = new MouseBarrierFeature(this._settings);
        this._barrierFeature.enable();

        this._activitiesFeature = new ActivitiesButtonFeature(this._settings);
        this._activitiesFeature.enable();

        this._windowMenuFeature = new WindowMenuFeature(this._settings);
        this._windowMenuFeature.enable();

        this._indicatorFeature = new WorkspaceIndicatorFeature(this._settings);
        this._indicatorFeature.enable();
    }

    /**
     * The main exit point. Called when the extension is disabled by the user
     * or right before the screen locks.
     */
    disable() {
        // --- Disable all our features ---
        // Each feature's disable() method handles its own cleanup
        // (restoring UI, disconnecting signals, etc.)

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
        
        // Properly dispose of the settings object to prevent memory leaks and crashes.
        this._settings?.run_dispose();
        this._settings = null;
    }
}



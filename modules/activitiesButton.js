// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Activities Button Feature
 *
 * This file contains all the logic for modifying the
 * behavior on click of the 'Activities' button in the top panel.
 */
 
'use strict';

import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class ActivitiesButtonFeature {
    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
        this._activitiesButton = null; 
        // Used in disable() to restore the button to its pre-extension state
        this._originalActivitiesState = { reactive: true, visible: true };
        // Used to manage the startup timer
        this._initTimeoutId = null;
    }

    /**
     * Enables the feature, connects to settings, and applies the current setting
     * with a delay to win the race condition.
     */
    enable() {
        // Wrap the entire enable logic in a timer
        // to ensure it runs after other extensions on unlock.
        this._initTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            
            try {
                this._activitiesButton = Main.panel.statusArea['activities'];
            } catch {
                this._activitiesButton = null;
            }

            if (!this._activitiesButton) {
                this._initTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            }

            this._originalActivitiesState.reactive = this._activitiesButton.reactive;
            this._originalActivitiesState.visible = this._activitiesButton.container.visible;

            this._settingsConnection = this._settings.connect(
                'changed::activities-button-mode',
                () => this._updateActivitiesButton()
            );

            this._updateActivitiesButton();
            
            this._initTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Disables the feature, cleans up listeners, and restores the button.
     */
    disable() {
        // --- If we are disabled before our timer fires, cancel it! ---
        if (this._initTimeoutId) {
            GLib.source_remove(this._initTimeoutId);
            this._initTimeoutId = null;
        }

        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }

        // Restore the button to its original, pre-extension state
        if (this._activitiesButton) {
            this._activitiesButton.reactive = this._originalActivitiesState.reactive;
            this._activitiesButton.container.visible = this._originalActivitiesState.visible;
        }
        
        this._activitiesButton = null;
    }

    /**
     * Reads the setting and applies the correct state (hidden,
     * unclickable, or default) to the Activities button.
     */
    _updateActivitiesButton() {
        if (!this._activitiesButton) return;
        
        const mode = this._settings.get_string('activities-button-mode');
        
        switch (mode) {
            case 'unclickable':
                this._activitiesButton.container.visible = true;
                this._activitiesButton.reactive = false;
                break;
            case 'hidden':
                this._activitiesButton.container.visible = false;
                break;
            default: // 'default'
                this._activitiesButton.container.visible = true;
                this._activitiesButton.reactive = true;
                break;
        }
    }
}



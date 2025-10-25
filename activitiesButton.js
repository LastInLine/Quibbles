/**
 * Activities Button Feature
 *
 * This file contains all the logic for modifying the
 * 'Activities' button in the top panel.
 */

import GLib from 'gi://GLib'; // Import the timer library
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class ActivitiesButtonFeature {
    /**
     * @param {Gio.Settings} settings - The extension's settings object.
     */
    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
        
        this._activitiesButton = null; 
        
        this._originalActivitiesState = { reactive: true, visible: true };

        // --- NEW: To manage our startup timer ---
        this._initTimeoutId = null;
    }

    /**
     * Enables the feature, connects to settings, and applies the current setting.
     * NOW WITH A DELAY to win the race condition.
     */
    enable() {
        // We wrap the *entire* enable logic in a timer.
        // This ensures we run *after* other extensions on unlock.
        this._initTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            
            try {
                // Find the button when enabled
                this._activitiesButton = Main.panel.statusArea['activities'];
            } catch(e) {
                // Error finding button
                this._activitiesButton = null;
            }

            if (!this._activitiesButton) {
                this._initTimeoutId = null;
                return GLib.SOURCE_REMOVE; // Stop timer, nothing to do
            }

            // Save original state
            this._originalActivitiesState.reactive = this._activitiesButton.reactive;
            this._originalActivitiesState.visible = this._activitiesButton.container.visible;

            // Connect to the setting.
            this._settingsConnection = this._settings.connect(
                'changed::activities-button-mode',
                () => this._updateActivitiesButton()
            );

            // Apply the setting immediately.
            this._updateActivitiesButton();
            
            this._initTimeoutId = null; // Mark timer as finished
            return GLib.SOURCE_REMOVE; // Stop the timer
        });
    }

    /**
     * Disables the feature, cleans up listeners, and restores the button.
     */
    disable() {
        // --- NEW: If we are disabled before our timer fires, cancel it! ---
        if (this._initTimeoutId) {
            GLib.source_remove(this._initTimeoutId);
            this._initTimeoutId = null;
        }

        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }

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



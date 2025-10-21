/**
 * Activities Button Feature
 *
 * This file contains all the logic for modifying the
 * 'Activities' button in the top panel.
 */

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class ActivitiesButtonFeature {
    /**
     * @param {Gio.Settings} settings - The extension's settings object.
     */
    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
        
        // Find the button widget.
        this._activitiesButton = Main.panel.statusArea['activities'];
        
        // Store its original state so we can restore it later.
        this._originalActivitiesState = { reactive: null, visible: null };
    }

    /**
     * Enables the feature, connects to settings, and applies the current setting.
     */
    enable() {
        if (!this._activitiesButton) {
            // If the button wasn't found (e.g., another extension removed it),
            // do nothing.
            return;
        }

        // Save the button's original state *before* we modify it.
        this._originalActivitiesState.reactive = this._activitiesButton.reactive;
        this._originalActivitiesState.visible = this._activitiesButton.visible;

        // Connect to the setting.
        this._settingsConnection = this._settings.connect(
            'changed::activities-button-mode',
            () => this._updateActivitiesButton()
        );

        // Apply the setting immediately on startup.
        this._updateActivitiesButton();
    }

    /**
     * Disables the feature, cleans up listeners, and restores the button.
     */
    disable() {
        // Disconnect our settings listener.
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }

        // Restore the Activities button to its original state.
        if (this._activitiesButton) {
            this._activitiesButton.reactive = this._originalActivitiesState.reactive;
            this._activitiesButton.visible = this._originalActivitiesState.visible;
        }
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
                this._activitiesButton.visible = true;
                this._activitiesButton.reactive = false;
                break;
            case 'hidden':
                this._activitiesButton.visible = false;
                break;
            default: // 'default'
                this._activitiesButton.visible = true;
                this._activitiesButton.reactive = true;
                break;
        }
    }
}


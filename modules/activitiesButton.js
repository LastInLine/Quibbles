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
import { waitFor } from './shellUtils.js';

export class ActivitiesButtonFeature {
    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
        this._activitiesButton = null; 
        // Used in disable() to restore the button to its pre-extension state
        this._originalActivitiesState = { reactive: true, visible: true };
        this._timeoutId = null;
    }

    /**
     * Enables the feature, connects to settings, and applies the current setting.
     */
    enable() {
        // Poll for the existence of the Activities button in the panel
        this._timeoutId = waitFor(
            () => {
                try {
                    return !!Main.panel.statusArea['activities'];
                } catch {
                    return false;
                }
            },
            () => {
                this._initialize();
                this._timeoutId = null;
            }
        );
    }

    _initialize() {
        this._activitiesButton = Main.panel.statusArea['activities'];

        this._originalActivitiesState.reactive = this._activitiesButton.reactive;
        this._originalActivitiesState.visible = this._activitiesButton.container.visible;

        this._settingsConnection = this._settings.connect(
            'changed::activities-button-mode',
            () => this._updateActivitiesButton()
        );

        this._updateActivitiesButton();
    }

    /**
     * Disables the feature, cleans up listeners, and restores the button.
     */
    disable() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
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

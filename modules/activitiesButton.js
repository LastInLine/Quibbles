// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

/**
 * Activities Button Feature
 *
 * This file contains all the logic for modifying the behavior
 * of or hiding the 'Activities' button in the top panel.
 */
 
'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// --------------------
// --- EXPORT CLASS ---
// --------------------

export class ActivitiesButtonFeature {
    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
        this._activitiesButton = null;
    }
    
    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------
    
    enable() {
        this._activitiesButton = Main.panel.statusArea['activities'];
        if (!this._activitiesButton) return;

        this._settingsConnection = this._settings.connect(
            'changed::activities-button-mode',
            () => this._updateActivitiesButton()
        );

        this._updateActivitiesButton();
    }

    disable() {
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }

        if (this._activitiesButton && 
            Main.sessionMode.currentMode !== 'unlock-dialog' && 
            Main.sessionMode.currentMode !== 'lock-screen') {
            
            this._activitiesButton.reactive = true;
            this._activitiesButton.container.visible = true;
        }
        
        this._activitiesButton = null;
    }
    
    // -------------
    // --- Logic ---
    // -------------

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
            default:
                this._activitiesButton.container.visible = true;
                this._activitiesButton.reactive = true;
                break;
        }
    }
}

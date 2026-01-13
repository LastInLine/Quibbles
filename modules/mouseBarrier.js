// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

/**
 * Mouse Barrier Feature
 *
 * This file contains all the logic for removing
 * the top-right mouse pressure barrier.
 */

'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// --------------------
// --- EXPORT CLASS ---
// --------------------

export class MouseBarrierFeature {

    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
        this._originalUpdatePanelBarrier = null;
    }
    
    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

    enable() {
        this._originalUpdatePanelBarrier = Main.layoutManager._updatePanelBarrier;

        Main.layoutManager._updatePanelBarrier = () => {
            // Run the original logic first to ensure the shell stays healthy
            if (this._originalUpdatePanelBarrier) {
                this._originalUpdatePanelBarrier.call(Main.layoutManager);
            }
            
            if (this._settings.get_boolean('remove-mouse-barrier')) {
                // Set the reference to null to prevent accessing destroyed memory
                if (Main.layoutManager._rightPanelBarrier) {
                    Main.layoutManager._rightPanelBarrier.destroy();
                    Main.layoutManager._rightPanelBarrier = null;
                }
            }
        };
        
        this._settingsConnection = this._settings.connect(
            'changed::remove-mouse-barrier',
            () => {
                Main.layoutManager._updatePanelBarrier();
            }
        );
        
        Main.layoutManager._updatePanelBarrier();
    }

    disable() {
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }
        
        if (this._originalUpdatePanelBarrier) {
            Main.layoutManager._updatePanelBarrier = this._originalUpdatePanelBarrier;
            this._originalUpdatePanelBarrier = null;
        }
        
        Main.layoutManager._updatePanelBarrier();
    }
}

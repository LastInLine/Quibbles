// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Mouse Barrier Feature
 *
 * This file contains all the logic for removing
 * the top-right mouse pressure barrier.
 *
 * ARCHITECTURE NOTE:
 * The barrier is a low-level Meta.Barrier object which cannot be modified
 * to be "permeable"; it must be destroyed. To do this safely without crashing
 * the shell, the logic hooks into the LayoutManager's update function to
 * intercept barrier creation.
 */

'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class MouseBarrierFeature {

    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
        this._originalUpdatePanelBarrier = null;
    }

    enable() {
        // Save the original function to restore it on disable
        this._originalUpdatePanelBarrier = Main.layoutManager._updatePanelBarrier;

        // Override the function to intercept barrier creation
        Main.layoutManager._updatePanelBarrier = () => {
            // Run the original logic first to ensure the shell stays healthy
            // (This ensures other barriers or panel logic still run)
            if (this._originalUpdatePanelBarrier) {
                this._originalUpdatePanelBarrier.call(Main.layoutManager);
            }

            // Check if the barrier removal setting is enabled
            if (this._settings.get_boolean('remove-mouse-barrier')) {
                // Safely destroy the barrier. Setting the reference to null
                // prevents the Shell from accessing destroyed memory (segfaults)
                // and tells internal logic that no barrier exists.
                if (Main.layoutManager._rightPanelBarrier) {
                    Main.layoutManager._rightPanelBarrier.destroy();
                    Main.layoutManager._rightPanelBarrier = null;
                }
            }
        };

        // Connect listener to apply changes immediately when settings change
        this._settingsConnection = this._settings.connect(
            'changed::remove-mouse-barrier',
            () => {
                // Force the shell to re-evaluate the barrier immediately
                Main.layoutManager._updatePanelBarrier();
            }
        );

        // Force an immediate update to apply the patch without waiting
        Main.layoutManager._updatePanelBarrier();
    }

    disable() {
        // Disconnect settings listener
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }

        // Restore the original function
        if (this._originalUpdatePanelBarrier) {
            Main.layoutManager._updatePanelBarrier = this._originalUpdatePanelBarrier;
            this._originalUpdatePanelBarrier = null;
        }

        // Force an update to restore the barrier if necessary
        Main.layoutManager._updatePanelBarrier();
    }
}

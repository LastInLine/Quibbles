// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Mouse Barrier Feature
 *
 * This file contains all the logic for removing 
 * the top-right mouse pressure barrier.
 */

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';

/**
 * Global flag to ensure the destructive `barrier.destroy()` action is
 * only called once per `enable()` cycle. This is reset in `disable()`
 * to re-arm the logic for the lock/unlock cycle.
 */
let barrierDestroyedThisSession = false;

export class MouseBarrierFeature {

    constructor(settings) {
        this._settings = settings;
        this._timeoutId = null;
        this._settingsConnection = null;
    }

    /**
     * Enables the feature, connects to settings, and runs the initial check.
     */
    enable() {
        this._settingsConnection = this._settings.connect(
            'changed::remove-mouse-barrier',
            () => this._checkBarrierTweak()
        );

        // A delay is required to ensure the panel is loaded before
        // attempting to find the barrier (race condition on startup)
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            this._checkBarrierTweak();
            this._timeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Disables the feature, cleans up listeners, and resets the session flag.
     */
    disable() {
        // The extension is disabled/re-enabled on lock/unlock.
        // Resetting the global flag here is critical, as it allows
        // enable() to re-apply the tweak after the user unlocks.
        barrierDestroyedThisSession = false;

        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
        }
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
        }
    }

    /**
     * Applies the barrier tweak. This is a destructive, one-way action
     * that can only be safely run once per session to prevent shell crashes.
     */
    _applyBarrierTweak() {
        if (!barrierDestroyedThisSession) {
            const barrier = Main.layoutManager._rightPanelBarrier;
            if (barrier) {
                barrier.destroy();
                barrierDestroyedThisSession = true;
            }
        }
    }

    /**
     * A gatekeeper function that checks if the barrier tweak should be applied.
     * It's called on startup and whenever the setting is changed.
     */
    _checkBarrierTweak() {
        if (this._settings.get_boolean('remove-mouse-barrier')) {
            this._applyBarrierTweak();
        }
    }
}


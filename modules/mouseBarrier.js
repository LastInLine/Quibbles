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
 * only called once per shell session. It is set to true when
 * destroyed, and reset to false in enable() *only* on an unlock,
 * which is when GNOME Shell rebuilds the barrier.
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
     * @param {boolean} isStartup - True if this is the first run on shell startup.
     */
    enable(isStartup = false) {
        // On unlock (!isStartup), the barrier has been rebuilt by the shell and the
        // global flag to 'false' so it can be destroyed again. This is NOT done in
        //  disable() to prevent crashes on a double-enable.
        if (!isStartup) {
            barrierDestroyedThisSession = false;
        }

        this._settingsConnection = this._settings.connect(
            'changed::remove-mouse-barrier',
            () => this._checkBarrierTweak()
        );

        if (isStartup) {
            // On STARTUP, a delay is required to ensure the panel is loaded
            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                this._checkBarrierTweak();
                this._timeoutId = null;
                return GLib.SOURCE_REMOVE;
            });
        } else {
            // On UNLOCK, the panel is already loaded so use
            // idle_add to run this as soon as the shell is ready
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                this._checkBarrierTweak();
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    /**
     * Disables the feature and cleans up listeners.
     */
    disable() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
        }
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
        }
    }

    /**
     * Applies the barrier tweak in a destructive, one-way action that
     * can only be safely run once per session to prevent shell crashes
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
     * Gatekeeper function that checks if the barrier tweak should be applied
     * which is called on startup and whenever the setting is changed
     */
    _checkBarrierTweak() {
        if (this._settings.get_boolean('remove-mouse-barrier')) {
            this._applyBarrierTweak();
        }
    }
}

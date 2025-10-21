/**
 * Mouse Barrier Feature
 *
 * This file contains all the logic for removing the top-right
 * mouse pressure barrier.
 */

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';

/**
 * A session-wide flag to ensure we only try to destroy the panel barrier once.
 * This is defined outside the class so it persists across enable/disable cycles
 * (e.g., when the screen locks).
 */
let barrierDestroyedThisSession = false;

export class MouseBarrierFeature {
    /**
     * @param {Gio.Settings} settings - The extension's settings object.
     */
    constructor(settings) {
        this._settings = settings;
        this._timeoutId = null;
        this._settingsConnection = null;
    }

    /**
     * Enables the feature, connects to settings, and runs the initial check.
     */
    enable() {
        // Connect to the setting.
        this._settingsConnection = this._settings.connect(
            'changed::remove-mouse-barrier',
            () => this._checkBarrierTweak()
        );

        // Apply the barrier tweak after a short delay to ensure the panel is fully loaded.
        // This is a workaround for a race condition on startup.
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            this._checkBarrierTweak();
            this._timeoutId = null; // Clear the timer ID
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Disables the feature, cleans up listeners, and resets the session flag.
     */
    disable() {
        // This is the key to the lock screen fix. Because the shell reloads
        // extensions after unlock, this `disable` function is called right
        // before the lock screen appears. By resetting the safety flag here,
        // we re-arm the barrier removal for when `enable` is called on unlock.
        barrierDestroyedThisSession = false;

        // Clean up timer and setting connection.
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
                barrierDestroyedThisSession = true; // Set the safety flag for this session.
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


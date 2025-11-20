// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Shared utility functions for the Shell Extension logic.
 */

'use strict';

import GLib from 'gi://GLib';

/**
 * Smart Poller: Runs checkFunc repeatedly until it returns true or times out.
 * @param {Function} checkFunc - Function that returns true if condition is met, false otherwise.
 * @param {Function} onSuccess - Function to execute once checkFunc returns true.
 * @param {number} [interval=100] - Polling interval in milliseconds.
 * @param {number} [timeout=5000] - Maximum time to wait in milliseconds.
 * @returns {number} - The GLib source ID.
 */
export function waitFor(checkFunc, onSuccess, interval = 100, timeout = 5000) {
    let elapsed = 0;

    return GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
        try {
            if (checkFunc()) {
                onSuccess();
                return GLib.SOURCE_REMOVE;
            }
        } catch { }

        elapsed += interval;
        if (elapsed >= timeout) {
            console.warn(`Quibbles: Timed out waiting for UI element.`);
            return GLib.SOURCE_REMOVE;
        }

        return GLib.SOURCE_CONTINUE;
    });
}

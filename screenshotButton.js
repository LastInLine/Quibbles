// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib'; // Needed for setTimeout

/**
 * Manages the visibility of the Screenshot button in the Quick Settings menu.
 * This module waits for the shell to stabilize before attempting to find
 * the button, fixing a startup race condition.
 */
export class ScreenshotButtonModule {
    constructor(settings) {
        this._settings = settings;
        this._button = null;
        this._signalId = null;
        this._timeoutId = null; // To store the timeout ID
    }

    enable() {
        // Connect the settings toggle *immediately*.
        this._signalId = this._settings.connect(
            'changed::hide-screenshot-button',
            () => this._updateVisibility()
        );

        // Wait 1.5 seconds for the shell to stabilize before searching
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            this._findAndToggleButton();
            this._timeoutId = null; // Clear the ID
            return GLib.SOURCE_REMOVE; // Stop the timeout
        });
    }

    disable() {
        if (this._signalId) {
            this._settings.disconnect(this._signalId);
            this._signalId = null;
        }

        // If the timeout is still pending, cancel it
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }

        // Re-show the button if we found it
        if (this._button) {
            this._button.visible = true;
        }

        this._button = null;
    }

    /**
     * Finds the button using the known-correct search path and updates visibility.
     */
    _findAndToggleButton() {
        if (this._button) {
            this._updateVisibility();
            return;
        }

        try {
            const quickSettings = Main.panel.statusArea.quickSettings;

            // This is the known-correct path we found: _system -> _systemItem -> child
            const systemItemChild = quickSettings._system?._systemItem?.child;
            
            if (!systemItemChild) {
                return;
            }

            for (const child of systemItemChild.get_children()) {
                if (child.constructor.name === 'ScreenshotItem') {
                    this._button = child;
                    break; // Found it, stop looping
                }
            }

            // --- Final check ---
            if (this._button) {
                this._updateVisibility(); // Set its initial state
            }
        } catch (e) {
            // Error finding button, do nothing.
            this._button = null;
        }
    }

    _updateVisibility() {
        if (!this._button) {
            return;
        }

        const shouldHide = this._settings.get_boolean('hide-screenshot-button');
        this._button.visible = !shouldHide;
    }
}



// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Screenshot Button Feature
 *
 * This file contains all the logic for removing the screenshot
 * button in the system section of the quick settings menu.
 */

'use strict';
 
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';

export class ScreenshotButtonModule {
    constructor(settings) {
        this._settings = settings;
        this._button = null;
        this._signalId = null;
        this._timeoutId = null;
    }

    enable() {
        this._signalId = this._settings.connect(
            'changed::hide-screenshot-button',
            () => this._updateVisibility()
        );

        // Wait for the shell to stabilize before searching
        // for the button to avoid a startup race condition
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            this._findAndToggleButton();
            this._timeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        if (this._signalId) {
            this._settings.disconnect(this._signalId);
            this._signalId = null;
        }

        // If enable() is still waiting, cancel the pending timeout
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }

        // Always restore visibility on disable
        if (this._button) {
            this._button.visible = true;
        }

        this._button = null;
    }

    /**
     * Finds the button and updates visibility.
     */
    _findAndToggleButton() {
        if (this._button) {
            this._updateVisibility();
            return;
        }

        try {
            const quickSettings = Main.panel.statusArea.quickSettings;

            // This is the fragile path to the button's parent
            const systemItemChild = quickSettings._system?._systemItem?.child;
            
            if (!systemItemChild) {
                return;
            }

            for (const child of systemItemChild.get_children()) {
                if (child.constructor.name === 'ScreenshotItem') {
                    this._button = child;
                    break;
                }
            }

            if (this._button) {
                this._updateVisibility();
            }
        } catch {
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

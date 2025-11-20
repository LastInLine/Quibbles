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
import { waitFor } from './shellUtils.js';

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

        // Poll for the existence of the screenshot button
        this._timeoutId = waitFor(
            () => {
                // Attempt to find the button.
                // If found, _button is set to the object.
                // Returns true if found, false otherwise.
                this._findAndToggleButton();
                return this._button !== null;
            },
            () => {
                // Once found, ensure the correct visibility state is applied.
                this._updateVisibility();
                this._timeoutId = null;
            }
        );
    }

    disable() {
        if (this._signalId) {
            this._settings.disconnect(this._signalId);
            this._signalId = null;
        }

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
     * Finds the button object in the UI hierarchy.
     * Sets this._button if found.
     */
    _findAndToggleButton() {
        if (this._button) {
            return;
        }

        try {
            const quickSettings = Main.panel.statusArea.quickSettings;

            // Navigate the internal hierarchy to find the system item container
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

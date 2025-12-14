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

// --------------------
// --- EXPORT CLASS ---
// --------------------

export class ScreenshotButtonModule {
    constructor(settings) {
        this._settings = settings;
        this._button = null;
        this._signalId = null;
        this._timeoutId = null;
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

    enable() {
        this._signalId = this._settings.connect(
            'changed::hide-screenshot-button',
            () => this._updateVisibility()
        );

        this._timeoutId = waitFor(
            () => {
                this._findButton();
                return this._button !== null;
            },
            () => {
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

        if (this._button) {
            this._button.visible = true;
        }

        this._button = null;
    }
    
    // -------------
    // --- Logic ---
    // -------------

    // Locates the screenshot button inside the Quick Settings hierarchy
    _findButton() {
        if (this._button) return;
        
        const quickSettings = Main.panel.statusArea.quickSettings;
        const systemItemChild = quickSettings._system?._systemItem?.child;
        
        if (!systemItemChild) return;

        const children = systemItemChild.get_children();
        for (const child of children) {
            if (child.constructor.name === 'ScreenshotItem') {
                this._button = child;
                break;
            }
        }
    }

    // Toggles the button based on settings
    _updateVisibility() {
        if (!this._button) {
            return;
        }

        const shouldHide = this._settings.get_boolean('hide-screenshot-button');
        this._button.visible = !shouldHide;
    }
}

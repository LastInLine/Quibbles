// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

/**
 * Screenshot Button Feature
 *
 * This file contains all the logic for removing the screenshot
 * button in the system section of the quick settings menu.
 */

'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import { findChildByClassName } from './shellUtils.js';

// --------------------
// --- EXPORT CLASS ---
// --------------------

export class ScreenshotButtonModule {
    constructor(settings) {
        this._settings = settings;
        this._button = null;
        this._signalId = null;
        this._idleId = null;
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

    enable() {
        this._idleId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
            this._findButton();
            if (this._button) {
                this._updateVisibility();
            }
            this._idleId = null;
            return GLib.SOURCE_REMOVE;
        });

        this._signalId = this._settings.connect(
            'changed::hide-screenshot-button',
            () => this._updateVisibility()
        );
    }

    disable() {
        if (this._signalId) {
            this._settings.disconnect(this._signalId);
            this._signalId = null;
        }

        if (this._idleId) {
            GLib.source_remove(this._idleId);
            this._idleId = null;
        }

        if (this._button) {
            this._button.visible = true;
            this._button = null;
        }
    }

    // -------------
    // --- Logic ---
    // -------------

    // Locates the screenshot button inside the Quick Settings hierarchy
    _findButton() {
        if (this._button) return;

        const quickSettings = Main.panel.statusArea.quickSettings;
        if (!quickSettings || !quickSettings.menu) return;
        
        this._button = findChildByClassName(quickSettings.menu.box, 'ScreenshotItem');
    }

    // Toggles the button based on settings
    _updateVisibility() {
        if (!this._button) return;

        const shouldHide = this._settings.get_boolean('hide-screenshot-button');
        this._button.visible = !shouldHide;
    }
}

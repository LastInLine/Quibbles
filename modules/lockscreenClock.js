// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Lockscreen Clock Feature
 *
 * This file contains all the logic for allowing
 * the user to specify the lockscreen clock font.
 */
 
'use strict';

import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Pango from 'gi://Pango';
import { waitFor } from './shellUtils.js';

// --------------------
// --- EXPORT CLASS ---
// --------------------

export default class LockscreenClock {
    
    constructor() {
        this._settings = null;
        this._timeLabel = null;
        this._originalTimeStyle = null;
        this._settingsChangedId = null;
        this._timeoutId = null;
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

    enable(settings) {
        this._settings = settings;
        this._waitForClock();
    }

    disable() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }

        if (this._timeLabel) {
            try {
                this._timeLabel.set_style(this._originalTimeStyle);
            } catch (e) {
                console.warn(`[Quibbles] Lockscreen clock not present to restore: ${e.message}`);
            }
        }

        if (this._settings && this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
        }

        this._timeLabel = null;
        this._originalTimeStyle = null;
        this._settings = null;
        this._settingsChangedId = null;
    }

    // -------------
    // --- Logic ---
    // -------------

    // Uses the shared utility to wait for the clock element to appear
    _waitForClock() {
        this._timeoutId = waitFor(
            () => Main.screenShield._dialog?._clock?._time,
            () => {
                const clock = Main.screenShield._dialog._clock;
                this._initClock(clock);
                this._timeoutId = null;
            }
        );
    }

    // Hooks up the settings listener and saves the original state
    _initClock(clock) {
        this._timeLabel = clock._time;
        this._originalTimeStyle = this._timeLabel.get_style() || '';
        
        this._settingsChangedId = this._settings.connect('changed::font-desc', () => {
            this._applyStyle();
        });

        this._applyStyle();
    }

    // Translates the font setting into CSS and applies it to the clock
    _applyStyle() {
        if (!this._timeLabel) {
            return;
        }

        const fontString = this._settings.get_string('font-desc');
        let css = '';

        if (fontString) {
            const fontDesc = Pango.FontDescription.from_string(fontString);
            const family = fontDesc.get_family();
            const size = fontDesc.get_size() / Pango.SCALE; 
            const weight = fontDesc.get_weight();
            const style = fontDesc.get_style();

            if (family) { css += `font-family: "${family}"; `; }
            if (size > 0) { css += `font-size: ${size}px; `; }
            if (weight) { css += `font-weight: ${weight}; `; }
            if (style === Pango.Style.ITALIC) { css += 'font-style: italic; '; }
            else if (style === Pango.Style.OBLIQUE) { css += 'font-style: oblique; '; }
        }
        
        try {
            if (css) {
                this._timeLabel.set_style(css);
            } else {
                this._timeLabel.set_style(this._originalTimeStyle);
            }
        } catch (e) {
            console.warn(`[Quibbles] Failed to apply clock style: ${e.message}`);
            this._timeLabel = null;
        }
    }
}

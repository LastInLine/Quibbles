// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

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

// --------------------
// --- EXPORT CLASS ---
// --------------------

export default class LockscreenClock {
    
    constructor() {
        this._settings = null;
        this._timeLabel = null;
        this._originalTimeStyle = null;
        this._settingsChangedId = null;
        this._lockStateChangedId = null;
        this._clockDestroyId = null;
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

    enable(settings) {
        this._settings = settings;

        this._lockStateChangedId = Main.screenShield.connect('locked-changed', () => {
            if (Main.screenShield.locked) {
                this._findAndInitClock();
            }
        });

        if (Main.screenShield.locked) {
            this._findAndInitClock();
        }
    }

    disable() {
        if (this._lockStateChangedId) {
            Main.screenShield.disconnect(this._lockStateChangedId);
            this._lockStateChangedId = null;
        }

        if (this._settings && this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this._timeLabel) {
            if (this._clockDestroyId) {
                this._timeLabel.disconnect(this._clockDestroyId);
                this._clockDestroyId = null;
            }
            
            if (Main.screenShield.locked) {
                if (this._originalTimeStyle !== null) {
                    this._timeLabel.set_style(this._originalTimeStyle);
                }
            }

            this._timeLabel = null;
        }

        this._originalTimeStyle = null;
        this._settings = null;
    }

    // -------------
    // --- Logic ---
    // -------------

    // Locates the clock widget within the existing lock screen dialog
    _findAndInitClock() {
        const clock = Main.screenShield._dialog?._clock;
        
        if (clock) {
            this._initClock(clock);
        }
    }

    // Hooks up the settings listener and saves the original state
    _initClock(clock) {
        if (this._timeLabel === clock._time) {
            return;
        }

        this._timeLabel = clock._time;
        this._originalTimeStyle = this._timeLabel.get_style() || '';
        
        this._clockDestroyId = this._timeLabel.connect('destroy', () => {
            this._timeLabel = null;
            this._clockDestroyId = null;
        });
        
        if (!this._settingsChangedId) {
            this._settingsChangedId = this._settings.connect('changed::font-desc', () => {
                this._applyStyle();
            });
        }

        this._applyStyle();
    }

    // Translates the font setting into CSS and applies it to the clock
    _applyStyle() {
        if (!this._timeLabel) {
            return;
        }

        const fontString = this._settings.get_string('font-desc');
        const styleParts = [];

        if (fontString) {
            const fontDesc = Pango.FontDescription.from_string(fontString);
            const family = fontDesc.get_family();
            const size = fontDesc.get_size() / Pango.SCALE; 
            const weight = fontDesc.get_weight();
            const style = fontDesc.get_style();

            if (family) { styleParts.push(`font-family: "${family}"`); }
            if (size > 0) { styleParts.push(`font-size: ${size}px`); }
            if (weight) { styleParts.push(`font-weight: ${weight}`); }
            
            if (style === Pango.Style.ITALIC) { styleParts.push('font-style: italic'); }
            else if (style === Pango.Style.OBLIQUE) { styleParts.push('font-style: oblique'); }
        }
        
        if (styleParts.length > 0) {
            this._timeLabel.set_style(styleParts.join('; '));
        } else {
            this._timeLabel.set_style(this._originalTimeStyle);
        }
    }
}

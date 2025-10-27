// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Allows the user to specify the lockscreen clock font.
 */
 
'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Pango from 'gi://Pango';

export default class LockscreenClock {
    
    _settings = null;
    _timeLabel = null;
    _originalTimeStyle = null;
    _settingsChangedId = null;

    constructor() {
    }

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
        
        if (css) {
            this._timeLabel.set_style(css);
        } else {
            this._timeLabel.set_style(this._originalTimeStyle);
        }
    }

    enable(settings) {
        this._settings = settings;
        
        try {
            const clock = Main.screenShield._dialog._clock;
            
            if (clock && clock._time) {
                this._timeLabel = clock._time;
                
                this._originalTimeStyle = this._timeLabel.get_style() || '';
                
                this._settingsChangedId = this._settings.connect('changed::font-desc', () => {
                    this._applyStyle();
                });

                this._applyStyle();
                
            }
            
        } catch (e) {
        }
    }

    disable() {
        try {
            if (this._timeLabel) {
                this._timeLabel.set_style(this._originalTimeStyle);
            }
        } catch (e) {
        }

        try {
            if (this._settings && this._settingsChangedId) {
                this._settings.disconnect(this._settingsChangedId);
            }
        } catch (e) {
        }

        // Clean up
        this._timeLabel = null;
        this._originalTimeStyle = null;
        this._settings = null;
        this._settingsChangedId = null;
    }
}



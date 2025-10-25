'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Pango from 'gi://Pango';

const LOG_PREFIX = 'ZZZ ClockModule:';

export default class LockscreenClock {
    
    _settings = null;
    _timeLabel = null;
    _originalTimeStyle = null;
    _settingsChangedId = null;

    constructor() {
        // Properties are initialized here
    }

    _applyStyle() {
        if (!this._timeLabel) {
            console.log(`${LOG_PREFIX} _applyStyle called, but time label not found.`);
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
            console.log(`${LOG_PREFIX} Applying style: ${css}`);
            this._timeLabel.set_style(css);
        } else {
            console.log(`${LOG_PREFIX} No font set, restoring original style.`);
            this._timeLabel.set_style(this._originalTimeStyle);
        }
    }

    enable(settings) {
        console.log(`${LOG_PREFIX} ENABLE function called (unlock-dialog).`);
        this._settings = settings;
        
        try {
            const clock = Main.screenShield._dialog._clock;
            
            if (clock && clock._time) {
                this._timeLabel = clock._time;
                console.log(`${LOG_PREFIX} Successfully found time label.`);
                
                this._originalTimeStyle = this._timeLabel.get_style() || '';
                
                this._settingsChangedId = this._settings.connect('changed::font-desc', () => {
                    this._applyStyle();
                });

                this._applyStyle();
                
            } else {
                console.error(`${LOG_PREFIX} Could not find _time label inside clock widget!`);
            }
            
        } catch (e) {
            console.error(`${LOG_PREFIX} Error during enable: ${e}`);
        }
    }

    disable() {
        console.log(`${LOG_PREFIX} DISABLE function called (unlock-dialog).`);
        
        try {
            if (this._timeLabel) {
                this._timeLabel.set_style(this._originalTimeStyle);
            }
        } catch (e) {
            console.error(`${LOG_PREFIX} Error restoring clock style: ${e}`);
        }

        try {
            if (this._settings && this._settingsChangedId) {
                this._settings.disconnect(this._settingsChangedId);
            }
        } catch (e) {
            console.error(`${LOG_PREFIX} Error disconnecting settings: ${e}`);
        }

        // Clean up
        this._timeLabel = null;
        this._originalTimeStyle = null;
        this._settings = null;
        this._settingsChangedId = null;
    }
}

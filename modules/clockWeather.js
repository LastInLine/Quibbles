// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

// Inspired by & refactored from weather-oclock by Cleo Menezes Jr.
// also known as the GNOME extension "Weather O'Clock"
// which is licensed under the GPL-3.0 license.

/**
 * Clock Weather Feature
 *
 * Adds current condition icon and temperature
 * after the clock on the date button
 */

'use strict';

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GWeather from 'gi://GWeather';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Weather from 'resource:///org/gnome/shell/misc/weather.js';

// -----------------------
// --- HELPER CLASS #1 ---
// -----------------------

const WeatherWidget = GObject.registerClass(
class WeatherWidget extends St.BoxLayout {
    _init(settings) {
        super._init({
            style_class: 'weather-box',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._settings = settings;
        this._weatherClient = new Weather.WeatherClient();

        this._icon = new St.Icon({
            style_class: 'system-status-icon weather-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._label = new St.Label({
            text: "...", 
            style_class: 'clock-label weather-label',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.add_child(this._icon);
        this.add_child(this._label);

        this._updateId = this._weatherClient.connect('changed', this._update.bind(this));

        this._weatherClient.update();

        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 600, () => {
            if (this._weatherClient) {
                this._weatherClient.update();
                return GLib.SOURCE_CONTINUE;
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _update() {
        if (!this._weatherClient) return;

        const info = this._weatherClient.info;
        if (!info) {
            this.visible = false;
            return;
        }

        const iconName = info.get_symbolic_icon_name();

        let tempValue = -1000;
        
        // GWeather 4.0+ API check
        if (info.get_value_temp) {
            const [ok, value] = info.get_value_temp(GWeather.TemperatureUnit.DEFAULT);
            if (ok) tempValue = value;
        } else {
            // Fallback for older API if necessary
            tempValue = info.get_temp();
        }
        
        if (iconName && tempValue > -999) {
            this._icon.icon_name = iconName;
            this._label.text = `${Math.round(tempValue)}°`;
            this.visible = true;
        } else {
            // Hide widget if data is incomplete
            this.visible = false;
        }
    }

    destroy() {
        if (this._updateId) {
            if (this._weatherClient) this._weatherClient.disconnect(this._updateId);
            this._updateId = null;
        }
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }
        this._weatherClient = null;
        super.destroy();
    }
});

// --------------------
// --- EXPORT CLASS ---
// --------------------

export class ClockWeatherFeature {
    constructor(settings) {
        this._settings = settings;
        this._dateMenu = Main.panel.statusArea.dateMenu;
        this._container = null;
        this._weatherWidget = null;
        this._settingsSignalId = null;
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

    enable() {
        this._settingsSignalId = this._settings.connect('changed::clock-weather-enabled', () => {
            this._syncState();
        });
        this._syncState();
    }

    disable() {
        if (this._settingsSignalId) {
            this._settings.disconnect(this._settingsSignalId);
            this._settingsSignalId = null;
        }
        this._disableFeature();
    }

    // -------------
    // --- Logic ---
    // -------------

    _syncState() {
        if (this._settings.get_boolean('clock-weather-enabled')) {
            this._enableFeature();
        } else {
            this._disableFeature();
        }
    }

    _enableFeature() {
        if (this._container) return; 

        const clockLabel = this._dateMenu._clockDisplay;
        if (!clockLabel) return;

        const parent = clockLabel.get_parent();

        if (parent && !parent.has_style_class_name('clock-weather-container')) {

            this._container = new St.BoxLayout({
                style_class: 'clock clock-weather-container',
            });

            this._weatherWidget = new WeatherWidget(this._settings);

            clockLabel.remove_style_class_name('clock');

            parent.replace_child(clockLabel, this._container);
            
            this._container.add_child(clockLabel);
            this._container.add_child(this._weatherWidget);
        }
    }

    _disableFeature() {
        if (this._weatherWidget) {
            this._weatherWidget.destroy();
            this._weatherWidget = null;
        }

        if (this._container) {
            const clockLabel = this._dateMenu._clockDisplay;
            
            if (clockLabel.get_parent() === this._container) {
                this._container.remove_child(clockLabel);
                
                if (!clockLabel.has_style_class_name('clock')) {
                    clockLabel.add_style_class_name('clock');
                }

                const parent = this._container.get_parent();
                if (parent) {
                    parent.replace_child(this._container, clockLabel);
                } else {
                    this._dateMenu.actor.add_child(clockLabel);
                }
            } 

            this._container.destroy();
            this._container = null;
        }
    }
}

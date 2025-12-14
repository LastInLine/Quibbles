// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

// Contains logic adapted from weather-oclock by Cleo Menezes Jr.
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
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Weather from 'resource:///org/gnome/shell/misc/weather.js';

// -----------------------
// --- HELPER CLASS #1 ---
// -----------------------

// Build the widget
const WeatherWidget = GObject.registerClass(
class WeatherWidget extends St.BoxLayout {
    _init(settings) {
        super._init({
            style_class: 'weather-box',
            visible: true, 
            reactive: true,
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
        
        // Polling rate in seconds
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 300, () => {
            if (this._weatherClient) {
                this._weatherClient.update();
                return GLib.SOURCE_CONTINUE;
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    // Retrieves current weather data from the client and updates the UI labels
    _update() {
        if (!this._weatherClient) return;

        const info = this._weatherClient.info;
        if (!info) return;

        const summary = info.get_temp_summary();

        if (summary && summary !== '--') {
            this._icon.icon_name = info.get_symbolic_icon_name();
            
            let text = summary;
            const match = summary.match(/-?\d+(\.\d+)?/);
            
           if (match) {
                const num = parseFloat(match[0]);
                text = Math.round(num) + "°";
            }
            
            this._label.text = text;
            this.visible = true;
        } else {
            this.visible = false;
        }
    }

    // Cleanup helper
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

    // Identifies whether the feature is enabled
    _syncState() {
        if (this._settings.get_boolean('clock-weather-enabled')) {
            this._enableFeature();
        } else {
            this._disableFeature();
        }
    }
    // Constructs the container, instantiates the widget, and puts it on the panel
    _enableFeature() {
        if (this._container) return; 

        const clockLabel = this._dateMenu._clockDisplay;
        if (!clockLabel) return;

        const parent = clockLabel.get_parent();
        if (parent) {
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

    // Destroys the widget, makes sure the clock isn't in the container, then destroys the container
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

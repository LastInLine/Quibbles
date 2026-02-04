// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

/**
 * Temperature Warning Feature
 *
 * This file contains all the logic for showing the temperature of a
 * user-specified sensor at user-specified thresholds in the top panel.
 */
 
'use strict';

import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as SensorPicker from './sensorPicker.js';

// --------------------
// --- HELPER CLASS ---
// --------------------

const TempIndicator = GObject.registerClass(
class TempIndicator extends PanelMenu.Button {
    constructor(settings) {
        super(0.0, 'Temp Indicator', false);
        
        this._settings = settings;
        
        this.connect('event', (actor, event) => {
            if (event.type() === Clutter.EventType.BUTTON_RELEASE) {
                this._launchApp();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._box = new St.BoxLayout({
            style_class: 'panel-status-menu-box'
        });
        
        this.add_child(this._box);

        this._icon = new St.Icon({
            icon_name: 'temperature-symbolic',
            style_class: 'system-status-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        
        this._box.add_child(this._icon);

        this._label = new St.Label({
            text: '...',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._box.add_child(this._label);

        this.visible = false;
    }

    // Define an app for the indicator to launch on click
    _launchApp() {
        const appId = this._settings.get_string('on-click-app');
        
        if (!appId) return;

        const appSys = Shell.AppSystem.get_default();
        const app = appSys.lookup_app(appId);

        if (app) {
            app.activate();
        } else {
            this.visible = false;
        }
    }

    update() {
        const sensorId = this._settings.get_string('sensor-id');
        const visibleThreshold = this._settings.get_int('visible-threshold');
        const warningThreshold = this._settings.get_int('warning-threshold');
        
        const tempC = SensorPicker.readSensorById(sensorId);
        
        if (tempC === null) {
            this.visible = false;
            return;
        }

        if (tempC >= visibleThreshold) {
            this.visible = true;
            let text = `${Math.round(tempC)}°C`;
            
            if (tempC >= warningThreshold) {
                text += ' 🔥';
            }
            this._label.set_text(text);
        } else {
            this.visible = false;
        }
    }
});

// --------------------
// --- EXPORT CLASS ---
// --------------------

export class TempWarningFeature {
    constructor(settings) {
        this._settings = settings;
        this._indicator = null;
        this._timeout = null;
        this._settingsChangedId = null;
        this._enabledChangedId = null;
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

    enable() {
        if (!this._settings.get_boolean('temperature-warning-enabled')) {
            this._enabledChangedId = this._settings.connect('changed::temperature-warning-enabled', () => {
                this.disable();
                this.enable();
            });
            return;
        }
        
        this._buildUI();
        this._settingsChangedId = this._settings.connect('changed', (settings, key) => {
            if (key === 'temperature-warning-enabled') {
                if (!settings.get_boolean(key)) {
                    this.disable();
                    this.enable(); 
                }
            } else if (key === 'temperature-warning-position' || key === 'temperature-warning-index') {
                this._rebuildUI();
            }
        });
        
        this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
            if (this._indicator) {
                this._indicator.update();
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    disable() {
        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this._enabledChangedId) {
            this._settings.disconnect(this._enabledChangedId);
            this._enabledChangedId = null;
        }
        
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }

    // -------------
    // --- Logic ---
    // -------------

    // Builds widget
    _buildUI() {
        this._indicator = new TempIndicator(this._settings);
        
        const side = this._settings.get_string('temperature-warning-position');
        const index = this._settings.get_int('temperature-warning-index');

        Main.panel.addToStatusArea('temp-warning', this._indicator, index, side);
    }

    // Rebuilds widget on move
    _rebuildUI() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        
        this._buildUI();
        this._indicator.update();
    }
}

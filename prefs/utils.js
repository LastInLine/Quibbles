// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Shared utility functions for the preferences window.
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

/**
 * Creates a standard Adw.ActionRow with a Gtk.Switch.
 * @param {string} title - The title for the row.
 * @param {string | null} subtitle - The subtitle for the row.
 * @param {Gio.Settings} settings - The GSettings object.
 * @param {string} settingName - The GSettings key to bind the switch to.
 * @returns {Adw.ActionRow}
 */
export function createSwitch(title, subtitle, settings, settingName) {
    const row = new Adw.ActionRow({ title, subtitle });
    const toggle = new Gtk.Switch({
        active: settings.get_boolean(settingName),
        valign: Gtk.Align.CENTER,
    });
    settings.bind(settingName, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
    row.add_suffix(toggle);
    row.activatable_widget = toggle;
    return row;
}


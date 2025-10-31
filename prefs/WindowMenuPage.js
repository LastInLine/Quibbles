// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Preferences page for Window Menu settings.
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// This is the full, canonical list of all possible window menu items.
const ALL_MENU_ITEMS = [
    'Scratch',
    'Take Screenshot',
    'Hide',
    'Maximize',
    'Move',
    'Resize',
    'Always on Top',
    'Always on Visible Workspace',
    'Move to Workspace Left',
    'Move to Workspace Right',
    'Move to Monitor Left',
    'Move to Monitor Right',
    'Close',
];

export class WindowMenuPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({
            title: _('Window Menu'),
            iconName: 'open-menu-symbolic'
        });
        
        // --- GROUP 1: Menu options ---
        const group = new Adw.PreferencesGroup({
            title: _('Menu options'),
            description: _('Controls the visibility of items in the window title bar context menu.'),
        });
        this.page.add(group);
        
        ALL_MENU_ITEMS.forEach(itemName => {
            const row = new Adw.ActionRow({ title: _(itemName) });
            group.add(row);
            const toggle = new Gtk.Switch({
                active: settings.get_strv('visible-items').includes(itemName),
                valign: Gtk.Align.CENTER,
            });
            toggle.connect('notify::active', (widget) => {
                let currentItems = settings.get_strv('visible-items');
                if (widget.active) {
                    currentItems.push(itemName);
                } else {
                    currentItems = currentItems.filter(item => item !== itemName);
                }
                settings.set_strv('visible-items', [...new Set(currentItems)]);
            });
            row.add_suffix(toggle);
            row.activatable_widget = toggle;
        });
    }
}


// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gettext from 'gettext'; 
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { createSwitch } from './prefsUtils.js';

const SHELL_DOMAIN = 'gnome-shell';

const STANDARD_ACTIONS_MAP = {
    'minimize': 'Minimize',
    'unmaximize': 'Unmaximize',
    'maximize': 'Maximize',
    'move': 'Move',
    'resize': 'Resize',
    'always-on-top': 'Always on Top',
    'always-on-visible-workspace': 'Always on Visible Workspace',
    'move-to-workspace-left': 'Move to Workspace Left',
    'move-to-workspace-right': 'Move to Workspace Right',
    'move-to-workspace-up': 'Move to Workspace Up',
    'move-to-workspace-down': 'Move to Workspace Down',
    'move-to-monitor-up': 'Move to Monitor Up',
    'move-to-monitor-down': 'Move to Monitor Down',
    'move-to-monitor-left': 'Move to Monitor Left',
    'move-to-monitor-right': 'Move to Monitor Right',
    'screenshot': 'Take Screenshot',
    'close': 'Close',
    'hide': 'Hide'
};

const WindowMenuBuilder = GObject.registerClass(
    class WindowMenuBuilder extends Adw.PreferencesGroup {
        constructor(settings) {
            super({
                title: _('Menu Items'),
                description: _('Reorder or remove items or separators.'),
            });

            this._settings = settings;
            this._displayedRows = [];

            const headerBox = new Gtk.Box({ spacing: 6, orientation: Gtk.Orientation.HORIZONTAL });

            const resetButton = new Gtk.Button({
                icon_name: 'edit-undo-symbolic',
                tooltip_text: _('Reset to Defaults'),
                css_classes: ['flat'],
            });
            resetButton.connect('clicked', () => {
                this._settings.reset('visible-items');
                this._settings.reset('available-custom-items');
            });
            headerBox.append(resetButton);

            const addButton = new Gtk.Button({
                child: new Adw.ButtonContent({ icon_name: 'list-add-symbolic', label: _('Add...') }),
                tooltip_text: _('Add a menu item'),
            });
            addButton.connect('clicked', this._onAdd.bind(this));
            headerBox.append(addButton);

            this.set_header_suffix(headerBox);

            this._settings.connect('changed::visible-items', this._refreshList.bind(this));
            this._refreshList();
        }

        _getLabel(id) {
            if (id === 'SEPARATOR') return _('--- Separator ---');
            if (STANDARD_ACTIONS_MAP[id]) {
                return Gettext.dgettext(SHELL_DOMAIN, STANDARD_ACTIONS_MAP[id]);
            }
            return id;
        }

        _onAdd() {
            const dialog = new Adw.Window({
                transient_for: this.get_root(),
                modal: true,
                default_width: 450,
                default_height: 700,
                title: _('Add Menu Item'),
            });

            const toolbarView = new Adw.ToolbarView();
            const headerBar = new Adw.HeaderBar();
            toolbarView.add_top_bar(headerBar);

            const page = new Adw.PreferencesPage();
            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                propagate_natural_height: true,
                child: page,
            });
            toolbarView.set_content(scroll);
            dialog.set_content(toolbarView);

            const activeItems = this._settings.get_strv('visible-items');
            const customPool = this._settings.get_strv('available-custom-items');
            
            const isUsed = (id) => activeItems.includes(id);

            // --- 1. Create New Custom Item ---
            const customGroup = new Adw.PreferencesGroup({
                title: _('Custom Item'),
                description: _('Define items added by other extensions appearing at the top of the menu.'),
            });
            page.add(customGroup);

            const customEntry = new Adw.EntryRow({ title: _('Item Label'), show_apply_button: true });
            customEntry.connect('apply', () => {
                const text = customEntry.text.trim();
                if (text) {
                    if (!customPool.includes(text)) {
                        this._settings.set_strv('available-custom-items', [...customPool, text]);
                    }
                    if (!isUsed(text)) {
                        this._settings.set_strv('visible-items', [text, ...activeItems]);
                    }
                    dialog.close();
                }
            });
            customGroup.add(customEntry);

            // --- 2. Available Items Pool ---
            const poolGroup = new Adw.PreferencesGroup({ title: _('Available Items') });
            page.add(poolGroup);

            const addOption = (id, displayName, isCustom = false) => {
                const row = new Adw.ActionRow({ title: displayName });
                
                const box = new Gtk.Box({ spacing: 6 });

                const addBtn = new Gtk.Button({
                    icon_name: 'list-add-symbolic',
                    valign: Gtk.Align.CENTER,
                    css_classes: ['flat'],
                    tooltip_text: _('Add to Menu'),
                });
                addBtn.connect('clicked', () => {
                    this._settings.set_strv('visible-items', [id, ...activeItems]);
                    dialog.close();
                });
                box.append(addBtn);

                if (isCustom) {
                    const delBtn = new Gtk.Button({
                        icon_name: 'user-trash-symbolic',
                        valign: Gtk.Align.CENTER,
                        css_classes: ['flat', 'destructive-action'],
                        tooltip_text: _('Delete Definition Permanently'),
                    });
                    delBtn.connect('clicked', () => {
                        const newPool = customPool.filter(x => x !== id);
                        this._settings.set_strv('available-custom-items', newPool);
                        dialog.close(); 
                    });
                    box.append(delBtn);
                }

                row.add_suffix(box);
                poolGroup.add(row);
            };

            addOption('SEPARATOR', this._getLabel('SEPARATOR'));

            // Custom items in pool
            customPool.forEach(id => {
                if (!isUsed(id)) addOption(id, id, true);
            });

            // Standard items in pool
            Object.keys(STANDARD_ACTIONS_MAP).forEach(id => {
                if (!isUsed(id)) addOption(id, this._getLabel(id));
            });

            dialog.present();
        }

        _refreshList() {
            const items = this._settings.get_strv('visible-items');

            for (const row of this._displayedRows) this.remove(row);
            this._displayedRows = [];

            items.forEach((item, index) => {
                // Hide 'OTHER' from the UI list
                if (item === 'OTHER') return;

                const title = this._getLabel(item);
                const row = new Adw.ActionRow({ title: title });

                const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });

                // --- MOVE UP ---
                const upBtn = new Gtk.Button({
                    icon_name: 'go-up-symbolic',
                    valign: Gtk.Align.CENTER,
                    tooltip_text: _('Move Up'),
                    css_classes: ['flat'],
                });
                if (index === 0) upBtn.sensitive = false;
                upBtn.connect('clicked', () => {
                    items.splice(index, 1);
                    items.splice(index - 1, 0, item);
                    this._settings.set_strv('visible-items', items);
                });
                box.append(upBtn);

                // --- MOVE DOWN ---
                const downBtn = new Gtk.Button({
                    icon_name: 'go-down-symbolic',
                    valign: Gtk.Align.CENTER,
                    tooltip_text: _('Move Down'),
                    css_classes: ['flat'],
                });
                if (index === items.length - 1) downBtn.sensitive = false;
                downBtn.connect('clicked', () => {
                    items.splice(index, 1);
                    items.splice(index + 1, 0, item);
                    this._settings.set_strv('visible-items', items);
                });
                box.append(downBtn);

                // --- REMOVE (Move to Pool) ---
                const removeBtn = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    valign: Gtk.Align.CENTER,
                    tooltip_text: _('Remove'),
                    css_classes: ['flat', 'destructive-action'],
                });
                removeBtn.connect('clicked', () => {
                    items.splice(index, 1);
                    this._settings.set_strv('visible-items', items);
                    
                    // If custom, verify it's in the pool
                    if (!STANDARD_ACTIONS_MAP[item] && item !== 'SEPARATOR') {
                        const pool = this._settings.get_strv('available-custom-items');
                        if (!pool.includes(item)) {
                            this._settings.set_strv('available-custom-items', [...pool, item]);
                        }
                    }
                });
                box.append(removeBtn);

                row.add_suffix(box);
                this.add(row);
                this._displayedRows.push(row);
            });
        }
    }
);

export class WindowMenuPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({
            title: _('Window Menu'),
            iconName: 'open-menu-symbolic'
        });

        const masterGroup = new Adw.PreferencesGroup();
        this.page.add(masterGroup);
        masterGroup.add(createSwitch(_('Enable Window Menu Modifications'), null, settings, 'enable-window-menu'));

        const builderGroup = new WindowMenuBuilder(settings);
        this.page.add(builderGroup);
        settings.bind('enable-window-menu', builderGroup, 'sensitive', Gio.SettingsBindFlags.DEFAULT);
    }
}

// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Preferences page for Window Menu settings.
 */
 
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

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

const WindowMenuBuilder = GObject.registerClass(
    class WindowMenuBuilder extends Adw.PreferencesGroup {
        constructor(settings) {
            super({
                title: _('Menu Items'),
                description: _('Reorder or remove items or separators.'),
            });

            this._settings = settings;
            this._displayedRows = [];

            // --- Header Buttons ---
            const headerBox = new Gtk.Box({
                spacing: 6,
                orientation: Gtk.Orientation.HORIZONTAL,
            });

            const resetButton = new Gtk.Button({
                icon_name: 'edit-undo-symbolic',
                tooltip_text: _('Reset to Defaults'),
                css_classes: ['flat'],
            });
            resetButton.connect('clicked', () => {
                this._settings.reset('visible-items');
            });
            headerBox.append(resetButton);

            const addButton = new Gtk.Button({
                child: new Adw.ButtonContent({
                    icon_name: 'list-add-symbolic',
                    label: _('Add...'),
                }),
                tooltip_text: _('Add a menu item or separator'),
            });
            addButton.connect('clicked', this._onAdd.bind(this));
            headerBox.append(addButton);

            this.set_header_suffix(headerBox);

            // --- Listeners ---
            this._settings.connect(
                'changed::visible-items',
                this._refreshList.bind(this)
            );

            this._refreshList();
        }

        _onAdd() {
            // --- Dialog Setup ---
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
            const group = new Adw.PreferencesGroup();
            page.add(group);

            const scrolled = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                propagate_natural_height: true,
            });
            scrolled.set_child(page);
            toolbarView.set_content(scrolled);
            
            dialog.set_content(toolbarView);

            // --- Populate List ---
            const currentItems = this._settings.get_strv('visible-items');

            const addOption = (name, isSeparator = false) => {
                const row = new Adw.ActionRow({
                    title: isSeparator ? _('--- Separator ---') : _(name),
                });
                
                const btn = new Gtk.Button({
                    icon_name: 'list-add-symbolic',
                    valign: Gtk.Align.CENTER,
                    css_classes: ['flat'],
                });

                btn.connect('clicked', () => {
                    const newList = [...currentItems, name];
                    this._settings.set_strv('visible-items', newList);
                    dialog.close();
                });

                row.add_suffix(btn);
                row.set_activatable_widget(btn);
                group.add(row);
            };

            addOption('SEPARATOR', true);

            ALL_MENU_ITEMS.forEach(item => {
                if (!currentItems.includes(item)) {
                    addOption(item);
                }
            });

            dialog.present();
        }

        _refreshList() {
            const items = this._settings.get_strv('visible-items');

            for (const row of this._displayedRows) {
                this.remove(row);
            }
            this._displayedRows = [];

            items.forEach((item, index) => {
                const isSeparator = (item === 'SEPARATOR');
                const title = isSeparator ? _('--- Separator ---') : _(item);

                const row = new Adw.ActionRow({ title: title });

                // --- Row Controls ---
                const box = new Gtk.Box({
                    orientation: Gtk.Orientation.HORIZONTAL,
                    spacing: 6,
                });

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

                const delBtn = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    valign: Gtk.Align.CENTER,
                    tooltip_text: _('Remove'),
                    css_classes: ['flat', 'destructive-action'],
                });
                delBtn.connect('clicked', () => {
                    items.splice(index, 1);
                    this._settings.set_strv('visible-items', items);
                });
                box.append(delBtn);

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

        const masterRow = new Adw.SwitchRow({
            title: _('Enable Window Menu Modifications'),
        });
        masterGroup.add(masterRow);

        settings.bind(
            'enable-window-menu',
            masterRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        const builderGroup = new WindowMenuBuilder(settings);
        this.page.add(builderGroup);

        settings.bind(
            'enable-window-menu',
            builderGroup,
            'sensitive',
            Gio.SettingsBindFlags.DEFAULT
        );
    }
}

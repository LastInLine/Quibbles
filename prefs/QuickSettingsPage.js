// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Preferences page for Quick Settings.
 */
 
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { createSwitch } from './utils.js';

// --- Applications Picker ---
const SystemMenuAppsPicker = GObject.registerClass(
    class SystemMenuAppsPicker extends Adw.PreferencesGroup {
        constructor(settings) {
            super({
                title: _('Applications'),
            });

            this._settings = settings;
            this._displayedApps = [];

            const addAppsButton = new Gtk.Button({
                child: new Adw.ButtonContent({
                    icon_name: 'list-add-symbolic',
                    label: _('Add...'),
                }),
                tooltip_text: _('Add an application'),
            });
            addAppsButton.connect('clicked', this._onAddApp.bind(this));
            this.set_header_suffix(addAppsButton);
            this._settings.connect(
                'changed::system-menu-apps',
                this._refreshApps.bind(this)
            );
            this._refreshApps();
        }

        _onAddApp() {
            // --- Dialog Setup ---
            const dialog = new Adw.Window({
                transient_for: this.get_root(),
                modal: true,
                default_width: 450,
                default_height: 700,
                title: _('Add Application'),
            });

            const toolbarView = new Adw.ToolbarView();
            const headerBar = new Adw.HeaderBar();
            toolbarView.add_top_bar(headerBar);

            // Search Bar
            const searchEntry = new Gtk.SearchEntry({
                placeholder_text: _('Search applications...'),
                margin_top: 6,
                margin_bottom: 6,
                margin_start: 12,
                margin_end: 12,
            });
            toolbarView.add_top_bar(searchEntry);

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
            const allApps = Gio.AppInfo.get_all().sort((a, b) => {
                return a.get_display_name().localeCompare(b.get_display_name());
            });

            const currentApps = this._settings.get_strv('system-menu-apps');
            const rows = [];

            allApps.forEach(app => {
                if (currentApps.includes(app.get_id())) return;

                const row = new Adw.ActionRow({
                    title: app.get_display_name(),
                    subtitle: app.get_id(),
                });

                const icon = new Gtk.Image({
                    gicon: app.get_icon(),
                    pixel_size: 32,
                });
                row.add_prefix(icon);

                const btn = new Gtk.Button({
                    icon_name: 'list-add-symbolic',
                    valign: Gtk.Align.CENTER,
                    css_classes: ['flat'],
                });

                btn.connect('clicked', () => {
                    const newList = [...currentApps, app.get_id()];
                    this._settings.set_strv('system-menu-apps', newList);
                    dialog.close();
                });

                row.add_suffix(btn);
                row.set_activatable_widget(btn);
                
                group.add(row);
                rows.push({ row, text: (app.get_display_name() + ' ' + app.get_id()).toLowerCase() });
            });

            // Search Logic
            searchEntry.connect('search-changed', () => {
                const term = searchEntry.text.toLowerCase();
                rows.forEach(item => {
                    item.row.visible = item.text.includes(term);
                });
            });

            dialog.present();
        }

        _refreshApps() {
            const apps = this._settings.get_strv('system-menu-apps');

            for (let i = 0; i < this._displayedApps.length; i++) {
                this.remove(this._displayedApps[i]);
            }
            this._displayedApps.length = 0;

            for (let index = 0; index < apps.length; ++index) {
                const app = apps[index];

                const appInfo = Gio.DesktopAppInfo.new(app);
                let title;
                let appIcon;
                if (appInfo === null) {
                    title = _('Application not found...');
                    appIcon = new Gtk.Image({
                        icon_name: 'process-stop-symbolic',
                        pixel_size: 32,
                    });
                } else {
                    title = appInfo.get_display_name();
                    appIcon = new Gtk.Image({
                        gicon: appInfo.get_icon(),
                        pixel_size: 32,
                    });
                }
                appIcon.get_style_context().add_class('icon-dropshadow');

                // --- Row Controls ---
                const buttonBox = new Gtk.Box({
                    orientation: Gtk.Orientation.HORIZONTAL,
                    halign: Gtk.Align.CENTER,
                    spacing: 6,
                });

                const upButton = new Gtk.Button({
                    icon_name: 'go-up-symbolic',
                    valign: Gtk.Align.CENTER,
                    tooltip_text: _('Move up'),
                    css_classes: ['flat'],
                });
                
                if (index === 0) upButton.sensitive = false;
                
                upButton.connect('clicked', () => {
                    apps.splice(index, 1);
                    apps.splice(index - 1, 0, app);
                    this._settings.set_strv('system-menu-apps', apps);
                });
                buttonBox.append(upButton);

                const downButton = new Gtk.Button({
                    icon_name: 'go-down-symbolic',
                    valign: Gtk.Align.CENTER,
                    tooltip_text: _('Move down'),
                    css_classes: ['flat'],
                });
                if (index === apps.length - 1) downButton.sensitive = false;
                
                downButton.connect('clicked', () => {
                    apps.splice(index, 1);
                    apps.splice(index + 1, 0, app);
                    this._settings.set_strv('system-menu-apps', apps);
                });
                buttonBox.append(downButton);

                const deleteButton = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    valign: Gtk.Align.CENTER,
                    tooltip_text: _('Remove'),
                    css_classes: ['flat', 'destructive-action'],
                });
                deleteButton.connect('clicked', () => {
                    apps.splice(index, 1);
                    this._settings.set_strv('system-menu-apps', apps);
                });
                buttonBox.append(deleteButton);

                const row = new Adw.ActionRow({
                    title: title,
                    subtitle: app.replace('.desktop', ''),
                });
                row.add_prefix(appIcon);
                row.add_suffix(buttonBox);

                this.add(row);
                this._displayedApps.push(row);
            }
        }
    }
);


export class QuickSettingsPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({
            title: _('Quick Settings'),
            iconName: 'org.gnome.Settings-desktop-sharing-symbolic'
        });

        // --- Mouse Barrier ---
        const barrierGroup = new Adw.PreferencesGroup({
            title: _('Mouse Barrier'),
            description: _('Fence to the right of Quick Settings icons when a second monitor is to the right.')
        });
        this.page.add(barrierGroup);

        barrierGroup.add(createSwitch(
            _('Remove Top-Right Mouse Barrier'),
           null,
            settings,
            'remove-mouse-barrier'
        ));

        // --- System Menu Apps ---
       const positionGroup = new Adw.PreferencesGroup({
            title: _('System Menu Apps'),
            description: _('Application icons to appear in the system menu.'),
        });
        this.page.add(positionGroup);
        
            positionGroup.add(createSwitch(
            _('Hide Screenshot Button'),
            null,
            settings,
            'hide-screenshot-button'
        ));
        
        const positionRow = new Adw.ActionRow({
            title: _('Launcher Position'),
        });

        const positionDropdown = new Gtk.DropDown({
            model: Gtk.StringList.new([
                _('Leftmost'),
                _('After Screenshot'),
            ]),
            valign: Gtk.Align.CENTER,
        });
        positionRow.add_suffix(positionDropdown);
        positionRow.activatable_widget = positionDropdown;
        
        const intToSelection = (intValue) => {
            if (intValue === 2) return 0; 
            return 1; 
        };

        const selectionToInt = (selection) => {
            if (selection === 0) return 2;
            return 3;
        };
        
        const currentPos = settings.get_int('system-menu-position');
        positionDropdown.set_selected(intToSelection(currentPos));

        positionDropdown.connect('notify::selected', () => {
            const newIntVal = selectionToInt(positionDropdown.selected);
            settings.set_int('system-menu-position', newIntVal);
        });

        settings.connect('changed::system-menu-position', () => {
            const newPos = settings.get_int('system-menu-position');
            positionDropdown.set_selected(intToSelection(newPos));
        });
        
        positionGroup.add(positionRow);
        
        // --- Applications List ---
        this.page.add(new SystemMenuAppsPicker(settings));
    }
}

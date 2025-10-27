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

// --- Applications Picker (from Tweaks extension) ---
// This class is only used by the QuickSettingsPage,
// so we can define it here instead of in its own file.
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
            const dialog = new Gtk.AppChooserDialog({
                transient_for: this.get_root(),
                modal: true,
            });
            dialog.get_widget().set({show_all: true});
            dialog.connect('response', (dlg, id) => {
                if (id === Gtk.ResponseType.OK) {
                    const appInfo = dialog.get_widget().get_app_info();
                    const apps = this._settings.get_strv('system-menu-apps');
                    apps.push(appInfo.get_id());
                    this._settings.set_strv('system-menu-apps', apps);
                }
                dialog.destroy();
            });
            dialog.show();
        }

        _refreshApps() {
            const apps = this._settings.get_strv('system-menu-apps');

            // Remove old
            for (let i = 0; i < this._displayedApps.length; i++) {
                this.remove(this._displayedApps[i]);
            }
            this._displayedApps.length = 0;

            // Add new
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

                const buttonBox = new Gtk.Box({
                    orientation: Gtk.Orientation.HORIZONTAL,
                    halign: Gtk.Align.CENTER,
                    spacing: 5,
                    hexpand: false,
                    vexpand: false,
                });

                const upButton = new Gtk.Button({
                    icon_name: 'go-up-symbolic',
                    valign: Gtk.Align.CENTER,
                    hexpand: false,
                    vexpand: false,
                    tooltip_text: _('Move up'),
                });
                if (index === 0) {
                    upButton.set_opacity(0.0);
                    upButton.sensitive = false;
                } else {
                    upButton.connect('clicked', () => {
                        apps.splice(index, 1);
                        apps.splice(index - 1, 0, app);
                        this._settings.set_strv('system-menu-apps', apps);
                    });
                }
                buttonBox.append(upButton);

                const downButton = new Gtk.Button({
                    icon_name: 'go-down-symbolic',
                    valign: Gtk.Align.CENTER,
                    hexpand: false,
                    vexpand: false,
                    tooltip_text: _('Move down'),
                });
                if (index === apps.length - 1) {
                    downButton.set_opacity(0.0);
                    downButton.sensitive = false;
                } else {
                    downButton.connect('clicked', () => {
                        apps.splice(index, 1);
                        apps.splice(index + 1, 0, app);
                        this._settings.set_strv('system-menu-apps', apps);
                    });
                }
                buttonBox.append(downButton);

                const deleteButton = new Gtk.Button({
                    icon_name: 'edit-delete-symbolic',
                    valign: Gtk.Align.CENTER,
                    hexpand: false,
                    vexpand: false,
                    tooltip_text: _('Remove'),
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

        // --- GROUP 1: Mouse Barrier ---
        const barrierGroup = new Adw.PreferencesGroup({
            title: _('Mouse Barrier'),
        });
        this.page.add(barrierGroup);

        barrierGroup.add(createSwitch(
            _('Remove Top-Right Mouse Barrier'),
            _('A shell restart is required to restore barrier once removed.'),
            settings,
            'remove-mouse-barrier'
        ));

        // --- GROUP 2: System Buttons Group ---
        const buttonsGroup = new Adw.PreferencesGroup({
            title: _('System Buttons'),
        });
        this.page.add(buttonsGroup);

        buttonsGroup.add(createSwitch(
            _('Hide Screenshot Button'),
            _('Removes the screenshot button from the Quick Settings menu.'),
            settings,
            'hide-screenshot-button'
        ));
        
        // --- GROUP 3: System Menu App Launcher Position ---
        const positionGroup = new Adw.PreferencesGroup({
            title: _('System Menu App Launchers'),
            description: _('List of applications to display in the system menu.'),
        });
        this.page.add(positionGroup);
        
        // Create the ActionRow for the position setting
        const positionRow = new Adw.ActionRow({
            title: _('Launcher Position'),
            subtitle: _('If set to -1 the position is automatic and buttons will show up after the Settings, otherwise the position is zero-indexed.'),
        });
        
        // Create the Adjustment for the spinner
        const positionAdjustment = new Gtk.Adjustment({
            lower: -1,  // Fixed: Manually set bounds
            upper: 20,  // Fixed: Manually set bounds
            step_increment: 1,
        });

        // Bind the adjustment's value to the setting
        settings.bind(
            'system-menu-position',
            positionAdjustment,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );

        // Create the compact SpinButton
        const positionSpinner = new Gtk.SpinButton({
            adjustment: positionAdjustment,
            valign: Gtk.Align.CENTER,
            numeric: true,
            climb_rate: 1,
            digits: 0, // No decimals
        });
        
        // Add the compact spinner as the suffix
        positionRow.add_suffix(positionSpinner);
        positionRow.activatable_widget = positionSpinner;
        
        // Add the position row to its own group
        positionGroup.add(positionRow); 
        
        // --- GROUP 4: System Menu Applications ---
        // This adds the App Picker as its own, separate group.
        this.page.add(new SystemMenuAppsPicker(settings));
    }
}


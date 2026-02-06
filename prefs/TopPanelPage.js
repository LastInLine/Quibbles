// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

/**
 * Preferences page for Top Panel settings which
 * controls quick settings modifications in a submenu.
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import * as SensorPicker from '../modules/sensorPicker.js';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { createSwitch } from './prefsUtils.js';

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

            const allApps = Gio.AppInfo.get_all().sort((a, b) => {
                return a.get_display_name().localeCompare(b.get_display_name());
            });

            const currentApps = this._settings.get_strv('system-menu-apps');
            const rows = [];

            allApps.forEach(app => {
                if (currentApps.includes(app.get_id())) return;

                const row = new Adw.ActionRow({
                    title: app.get_display_name(),
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

// =================
// === MAIN PAGE ===
// =================

export class TopPanelPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({
            title: _('Top Panel'),
            iconName: 'org.gnome.Settings-desktop-sharing-symbolic'
        });
        
        // =====================================
        // === GROUP 1: Workspace Management ===
        // =====================================

        const wsGroup = new Adw.PreferencesGroup({
            title: _('Workspace Management'),
        });
        this.page.add(wsGroup);
        
        // --- Workspace Indicator Toggle ---
        wsGroup.add(createSwitch(
            _('Enable Workspace Indicator'),
            _('Displays the current workspace name and a switcher menu.'),
            settings,
            'enable-workspace-indicator'
        ));

        // --- Indicator Position ---
        const validWsPos = ['left', 'center', 'right'];
        const currentWsPos = settings.get_string('workspace-indicator-position');
        let wsPosIdx = validWsPos.indexOf(currentWsPos);
        if (wsPosIdx === -1) wsPosIdx = 0;

        const posRow = new Adw.ActionRow({
            title: _('Indicator Position')
        });
        const posBox = new Gtk.Box({ spacing: 6, valign: Gtk.Align.CENTER });
        
        const posDrop = new Gtk.DropDown({
            model: Gtk.StringList.new([_('Left'), _('Center'), _('Right')]),
            selected: wsPosIdx
        });
        
        posDrop.connect('notify::selected', () => {
            settings.set_string('workspace-indicator-position', validWsPos[posDrop.selected]);
        });

        const idxSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({ 
                value: settings.get_int('workspace-indicator-index'), 
                lower: 0, 
                upper: 20, 
                step_increment: 1 
            }),
            digits: 0
        });
        
        settings.bind('workspace-indicator-index', idxSpin, 'value', Gio.SettingsBindFlags.DEFAULT);

        posBox.append(posDrop);
        posBox.append(idxSpin);
        posRow.add_suffix(posBox);
        wsGroup.add(posRow);

        settings.bind(
            'enable-workspace-indicator',
            posRow,
            'sensitive',
            Gio.SettingsBindFlags.DEFAULT
        );
        
        // --- Activities Button ---    
        const actRow = new Adw.ActionRow({ title: _('Activities Button') });
        const actDrop = new Gtk.DropDown({
            model: Gtk.StringList.new(['Default', 'Unclickable', 'Hidden']),
            selected: ['default', 'unclickable', 'hidden'].indexOf(settings.get_string('activities-button-mode')),
            valign: Gtk.Align.CENTER,
        });
        
        actDrop.connect('notify::selected', () => {
            const vals = ['default', 'unclickable', 'hidden'];
            settings.set_string('activities-button-mode', vals[actDrop.selected]);
        });
        
        actRow.add_suffix(actDrop);
        wsGroup.add(actRow);
        
        // ===============================
        // === GROUP 2: Date & Weather ===
        // ===============================
        
        const dateMenuGroup = new Adw.PreferencesGroup({
            title: _('Date &amp; Weather'),
        });
        this.page.add(dateMenuGroup);

        // --- Weather Toggle ---
        dateMenuGroup.add(createSwitch(
            _('Display Current Weather on the Date Button'),
            _('Add conditions and temperature to the right of the clock.'),
            settings,
            'clock-weather-enabled'
        ));

        // --- Google Calendar Handler Toggle ---
        const gCalSwitchRow = createSwitch(
            _('Open Events in Google Calendar'),
            _('Go to selected day in the default browser instead of GNOME Calendar.'),
            settings,
            'google-calendar-handler-enabled'
        );
        dateMenuGroup.add(gCalSwitchRow);

        // --- Google Calendar View Mode ---
        const viewRow = new Adw.ActionRow({ title: _('Google Calendar View') });
        const viewDrop = new Gtk.DropDown({
            model: Gtk.StringList.new(['Day', 'Week', 'Month', '4 Week']),
            valign: Gtk.Align.CENTER,
            selected: ['day', 'week', 'month', 'customweek'].indexOf(settings.get_string('google-calendar-default-view'))
        });

        viewDrop.connect('notify::selected', () => {
            const vals = ['day', 'week', 'month', 'customweek'];
            settings.set_string('google-calendar-default-view', vals[viewDrop.selected]);
        });

        settings.bind(
            'google-calendar-handler-enabled',
            viewRow,
            'sensitive',
            Gio.SettingsBindFlags.DEFAULT
        );

        viewRow.add_suffix(viewDrop);
        dateMenuGroup.add(viewRow);
        
        // ==================================
        // === GROUP 3: Status & Settings ===
        // ==================================
        
        const generalGroup = new Adw.PreferencesGroup({
            title: _('Status &amp; Settings'),
        });
        this.page.add(generalGroup);


        // --- Mouse Barrier Toggle ---
        generalGroup.add(createSwitch(
            _('Remove Mouse Barrier'),
            _('Fence to the right of Status icons when a second monitor is to the right.'),
            settings,
            'remove-mouse-barrier'
        ));


        // --- Temperature Warning ---        
        const twRow = new Adw.ActionRow({
            title: _('Temperature Warning'),
            subtitle: _('Get an indicator when a sensor reaches a temperature threshold.'),
            activatable: true,
        });
        
        twRow.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));
        twRow.connect('activated', () => {
            this.page.get_root().push_subpage(this._createTempWarningSubpage(settings));
        });
        generalGroup.add(twRow);


        // --- Quick Settings ---
        const qsRow = new Adw.ActionRow({
            title: _('Quick Settings System Menu'),
            subtitle: _('Add, remove, or reorder items in the system menu.'),
            activatable: true,
        });
        
        qsRow.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));
        qsRow.connect('activated', () => {
            this.page.get_root().push_subpage(this._createQuickSettingsSubpage(settings));
        });
        generalGroup.add(qsRow);
    }
    
    // ===================================
    // === TEMPERATURE WARNING SUBPAGE ===
    // ===================================
    
    _createTempWarningSubpage(settings) {
        const page = new Adw.NavigationPage({ title: _('Temperature Warning'), tag: 'tw' });
        const toolbarView = new Adw.ToolbarView();
        toolbarView.add_top_bar(new Adw.HeaderBar());
        
        const prefsPage = new Adw.PreferencesPage();
        
        // ========================
        // === Group 1: General ===
        // ========================
        
        const generalGroup = new Adw.PreferencesGroup();
        prefsPage.add(generalGroup);

        // --- Enable Toggle ---
        generalGroup.add(createSwitch(
            _('Enable Temperature Warning'),
            null,
            settings,
            'temperature-warning-enabled'
        ));

        // --- Widget Position ---
        const validPos = ['left', 'center', 'right'];
        const currentPos = settings.get_string('temperature-warning-position');
        let posIdx = validPos.indexOf(currentPos);
        if (posIdx === -1) posIdx = 0;

        const posRow = new Adw.ActionRow({ title: _('Indicator Position') });
        const posBox = new Gtk.Box({ spacing: 6, valign: Gtk.Align.CENTER });
        const posDrop = new Gtk.DropDown({
            model: Gtk.StringList.new([_('Left'), _('Center'), _('Right')]),
            selected: posIdx,
        });

        posDrop.connect('notify::selected', () => {
            settings.set_string('temperature-warning-position', validPos[posDrop.selected]);
        });

        const idxSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 20, step_increment: 1 }),
            digits: 0,
        });
        
        settings.bind('temperature-warning-index', idxSpin, 'value', Gio.SettingsBindFlags.DEFAULT);

        posBox.append(posDrop);
        posBox.append(idxSpin);
        posRow.add_suffix(posBox);
        generalGroup.add(posRow);

        // --- Sensor Selector ---
        const sensorRow = new Adw.ActionRow({
            title: _('Sensor to Monitor')
        });

        let sensors = SensorPicker.getSensorList() || [];
    
        if (sensors.length === 0) {
            sensors = [{ label: _('No sensors found'), id: '' }];
        }

        const sensorNames = sensors.map(s => s.label);
        const sensorIds = sensors.map(s => s.id);
    
        let selectedIdx = sensorIds.indexOf(settings.get_string('sensor-id'));
        if (selectedIdx === -1) selectedIdx = 0; 

        const sensorDrop = new Gtk.DropDown({
            model: Gtk.StringList.new(sensorNames),
            selected: selectedIdx,
            valign: Gtk.Align.CENTER,
        });

        sensorDrop.connect('notify::selected', () => {
            const newId = sensorIds[sensorDrop.selected];
            if (newId) settings.set_string('sensor-id', newId);
        });

        sensorRow.add_suffix(sensorDrop);
        generalGroup.add(sensorRow);
    
        // =====================================
        // === GROUP 2: On-Click Application ===
        // =====================================

        const appGroup = new Adw.PreferencesGroup({
            title: _('On-Click Application'),
        });
        prefsPage.add(appGroup);

        // --- Header Button ---
        const selectBtn = new Gtk.Button({
            label: _('Select'),
            valign: Gtk.Align.CENTER,
                tooltip_text: _('Select application')
        });
        appGroup.set_header_suffix(selectBtn);

        // --- Dynamic App Row ---
        let currentAppRow = null;

        const refreshAppRow = () => {
            if (currentAppRow) {
                appGroup.remove(currentAppRow);
                currentAppRow = null;
            }

            const appId = settings.get_string('on-click-app');

            if (!appId) {
                currentAppRow = new Adw.ActionRow({
                    title: _('No Application Selected'),
                    sensitive: false
                });
                appGroup.add(currentAppRow);
                return;
            }

            const appInfo = Gio.DesktopAppInfo.new(appId);
            const displayName = appInfo ? appInfo.get_display_name() : appId;
            const iconWidget = appInfo 
                ? new Gtk.Image({ gicon: appInfo.get_icon(), pixel_size: 32 })
                : new Gtk.Image({ icon_name: 'application-x-executable-symbolic', pixel_size: 32 });
        
            currentAppRow = new Adw.ActionRow({
                title: displayName,
                subtitle: appId
            });
            currentAppRow.add_prefix(iconWidget);

            const trashBtn = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                valign: Gtk.Align.CENTER,
                css_classes: ['flat', 'destructive-action'],
                tooltip_text: _('Clear selection')
            });

            trashBtn.connect('clicked', () => {
                settings.set_string('on-click-app', '');
                refreshAppRow();
            });

            currentAppRow.add_suffix(trashBtn);
            appGroup.add(currentAppRow);
        };

        selectBtn.connect('clicked', () => {
            this._showSingleAppPicker(selectBtn, settings, (newAppId) => {
                settings.set_string('on-click-app', newAppId);
                refreshAppRow();
            });
        });

        refreshAppRow();
    
        // ===========================
        // === GROUP 3: Thresholds ===
        // ===========================
    
        const thresholdGroup = new Adw.PreferencesGroup({ 
            title: _('Thresholds') 
        });
        prefsPage.add(thresholdGroup);
    
        // --- Visibility threshold ---
        const visRow = new Adw.ActionRow({ 
            title: _('Visibility Threshold (°C)')
        });
        
        const visSpin = new Gtk.SpinButton({ 
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 120, step_increment: 1 }), 
            valign: Gtk.Align.CENTER 
        });
        
        settings.bind('visible-threshold', visSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        visRow.add_suffix(visSpin);
        thresholdGroup.add(visRow);

        // --- Warning threshold ---
        const warnRow = new Adw.ActionRow({ 
            title: _('Warning Threshold (°C)')
        });
        
        const warnSpin = new Gtk.SpinButton({ 
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 120, step_increment: 1 }), 
            valign: Gtk.Align.CENTER 
        });
        
        settings.bind('warning-threshold', warnSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        warnRow.add_suffix(warnSpin);
        thresholdGroup.add(warnRow);

        toolbarView.set_content(prefsPage);
        page.set_child(toolbarView);
    
        return page;
    }
    
    // ==============================
    // === QUICK SETTINGS SUBPAGE ===
    // ==============================
    
    _createQuickSettingsSubpage(settings) {
        const page = new Adw.NavigationPage({ title: _('Quick Settings'), tag: 'qs' });
        const toolbarView = new Adw.ToolbarView();
        toolbarView.add_top_bar(new Adw.HeaderBar());
        
        const prefsPage = new Adw.PreferencesPage();
        
        // =========================
        // === Group 1: Settings ===
        // =========================
        
        const settingsGroup = new Adw.PreferencesGroup({
            title: _('System Menu Apps'),
            description: _('Application icons to appear in the system menu.'),
        });

        // --- Screenshot Button Toggle ---
        settingsGroup.add(createSwitch(
            _('Hide Screenshot Button'),
            null,
            settings,
            'hide-screenshot-button'
        ));
 
         // --- Launcher Position ---
        const launcherPosRow = new Adw.ActionRow({ title: _('Launcher Position') });
        const launcherDrop = new Gtk.DropDown({
            model: Gtk.StringList.new([_('Leftmost'), _('After Screenshot')]),
            valign: Gtk.Align.CENTER,
            selected: (settings.get_int('system-menu-position') === 2) ? 0 : 1
        });
        launcherDrop.connect('notify::selected', () => {
            settings.set_int('system-menu-position', (launcherDrop.selected === 0) ? 2 : 3);
        });
        launcherPosRow.add_suffix(launcherDrop);
        settingsGroup.add(launcherPosRow);
        
        prefsPage.add(settingsGroup);

        // ===========================
        // === Group 2: App Picker ===
        // ===========================
        
        prefsPage.add(new SystemMenuAppsPicker(settings));

        toolbarView.set_content(prefsPage);
        page.set_child(toolbarView);
        
        return page;
    }
    
    // ==========================
    // === SINGLE APP PICKER  ===
    // ==========================

    _showSingleAppPicker(parentRow, settings, callback) {
        const root = parentRow.get_root(); 
        
        const dialog = new Adw.Window({
            transient_for: root, 
            modal: true,
            default_width: 450,
            default_height: 700,
            title: _('Select Application'),
        });

        const toolbarView = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar();
        toolbarView.add_top_bar(headerBar);

        const searchEntry = new Gtk.SearchEntry({
            placeholder_text: _('Search applications...'),
            margin_top: 6, margin_bottom: 6, margin_start: 12, margin_end: 12,
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

        const allApps = Gio.AppInfo.get_all().sort((a, b) => 
            a.get_display_name().localeCompare(b.get_display_name())
        );

        const rows = [];
        allApps.forEach(app => {
            const row = new Adw.ActionRow({
                title: app.get_display_name(),
                subtitle: app.get_id()
            });

            const icon = new Gtk.Image({
                gicon: app.get_icon(),
                pixel_size: 32,
            });
            row.add_prefix(icon);

            row.set_activatable(true);
            row.connect('activated', () => {
                callback(app.get_id());
                dialog.close();
            });
            
            if (settings && settings.get_string('on-click-app') === app.get_id()) {
                row.add_suffix(new Gtk.Image({ icon_name: 'object-select-symbolic' }));
            }

            group.add(row);
            rows.push({ row, text: (app.get_display_name() + ' ' + app.get_id()).toLowerCase() });
        });

        searchEntry.connect('search-changed', () => {
            const term = searchEntry.text.toLowerCase();
            rows.forEach(item => {
                item.row.visible = item.text.includes(term);
            });
        });

        dialog.present();
    }
}

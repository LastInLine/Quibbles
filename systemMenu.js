// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.
// Contains logic adapted from Tweaks-system-menu by Philippe Troin (F-i-f)

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { QuickSettingsItem } from 'resource:///org/gnome/shell/ui/quickSettings.js';

/**
 * A custom QuickSettingsItem that acts as an application launcher
 */
const SystemMenuAppButton = GObject.registerClass(
    class SystemMenuAppButton extends QuickSettingsItem {
        constructor(appInfo) {
            super({
                style_class: 'icon-button',
                can_focus: true,
                icon_name: appInfo.app_info.get_icon()?.names[0] || 'application-x-executable-symbolic',
                visible: !Main.sessionMode.isGreeter,
                accessible_name: appInfo.get_name(),
            });

            this.connect('clicked', () => {
                Main.overview.hide();
                Main.panel.closeQuickSettings();
                appInfo.activate();
            });
        }
    }
);

/**
 * Manages adding custom app launchers to the system menu.
 */
export class SystemMenuModule {
    constructor(settings) {
        this._settings = settings;
        this._systemItemChild = null;
        this._launcherButtons = new Map();
        this._timeoutId = null;

        this._appsChangedId = null;
        this._posChangedId = null;
    }

    enable() {
        // We use the same 1.5s delay to ensure the shell is ready
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            this._initialize();
            this._timeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _initialize() {
        try {
            this._systemItemChild = Main.panel.statusArea.quickSettings._system._systemItem.child;
            if (!this._systemItemChild) {
                return;
            }

            this._appsChangedId = this._settings.connect(
                'changed::system-menu-apps',
                () => this._onApplicationsChange()
            );
            this._posChangedId = this._settings.connect(
                'changed::system-menu-position',
                () => this._onPositionChange()
            );

            this._onApplicationsChange();

        } catch (e) { }
    }

    disable() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }

        if (this._appsChangedId) {
            this._settings.disconnect(this._appsChangedId);
            this._appsChangedId = null;
        }
        if (this._posChangedId) {
            this._settings.disconnect(this._posChangedId);
            this._posChangedId = null;
        }

        for (const [app, button] of this._launcherButtons.entries()) {
            this._removeAppLauncher(app, button);
        }
        this._launcherButtons.clear();
        this._systemItemChild = null;
    }

    _removeAppLauncher(appId, button) {
        try {
            this._systemItemChild.remove_child(button);
            button.destroy();
        } catch (e) { }
    }

    _onApplicationsChange() {
        if (!this._systemItemChild) {
            return;
        }
        const wantedApps = this._settings.get_strv('system-menu-apps');
        const wantedAppsSet = new Set(wantedApps);

        // Remove unwanted buttons
        for (const appId of this._launcherButtons.keys()) {
            if (!wantedAppsSet.has(appId)) {
                this._removeAppLauncher(appId, this._launcherButtons.get(appId));
                this._launcherButtons.delete(appId);
            }
        }

        // Add new buttons
        for (const appId of wantedApps) {
            if (this._launcherButtons.has(appId)) {
                continue; // Already exists
            }

            const appInfo = Shell.AppSystem.get_default().lookup_app(appId);
            if (appInfo) {
                const button = new SystemMenuAppButton(appInfo);
                this._launcherButtons.set(appId, button);
                this._systemItemChild.add_child(button);
            } else {
                // App not found
            }
        }

        this._onPositionChange();
    }

    _onPositionChange() {
        if (!this._systemItemChild) {
            return;
        }

        // First, move all our buttons to the end
        const endPos = this._systemItemChild.get_n_children() - 1;
        for (const button of this._launcherButtons.values()) {
            this._systemItemChild.set_child_at_index(button, endPos);
        }

        // Now, position them correctly
        let position = this._settings.get_int('system-menu-position');
        
        if (position < 0) {
            // Find the 'Settings' button
            const children = this._systemItemChild.get_children();
            let settingsPos = -1;
            for (let i = 0; i < children.length; i++) {
                if (children[i].constructor.name === 'SettingsItem') {
                    settingsPos = i;
                    break;
                }
            }
            position = (settingsPos > -1) ? settingsPos + 1 : 1;
        }

        // Re-insert our buttons at the calculated position, in order
        const appIds = this._settings.get_strv('system-menu-apps');
        for (const appId of appIds) {
            const button = this._launcherButtons.get(appId);
            if (button) {
                this._systemItemChild.set_child_at_index(button, position);
                position++;
            }
        }
    }
}

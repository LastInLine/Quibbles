// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

// Contains logic adapted from Tweaks-system-menu by Philippe Troin (F-i-f)
// also known as the GNOME extension "Tweaks & Extensions in System Menu"
// which is licensed under the GPL-3.0 license.

/**
 * System Menu Feature
 *
 * This file contains all the logic for adding shortcut
 * buttons in the system section of the quick settings menu.
 */

'use strict';

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { QuickSettingsItem } from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { waitFor } from './shellUtils.js';

// -----------------------
// --- HELPER CLASS #1 ---
// -----------------------

// Builds the buttons to place in the launcher
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
});

// --------------------
// --- EXPORT CLASS ---
// --------------------

export class SystemMenuModule {

    constructor(settings) {
        this._settings = settings;
        this._systemItemChild = null;
        this._launcherButtons = new Map();
        this._timeoutId = null;

        this._appsChangedId = null;
        this._posChangedId = null;
        this._originalSettingsButton = null;
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------
    
    enable() {
        this._timeoutId = waitFor(
            () => {
                return !!Main.panel.statusArea.quickSettings._system._systemItem.child;
            },
            () => {
                this._initialize();
                this._timeoutId = null;
            }
        );
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
        
        if (this._originalSettingsButton) {
            this._originalSettingsButton.visible = true;
            this._originalSettingsButton = null;
        }
        
        this._systemItemChild = null;
    }

    // -------------
    // --- Logic ---
    // -------------

    // Creates a list of buttons to be included in the launcher
    _initialize() {
        this._systemItemChild = Main.panel.statusArea.quickSettings._system._systemItem.child;
        
        if (!this._systemItemChild) {
            return;
        }
        
        const children = this._systemItemChild.get_children();
        for (const child of children) {
            if (child.constructor.name === 'SettingsItem') {
                this._originalSettingsButton = child;
                this._originalSettingsButton.visible = false;
                break;
            }
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
    }
    
    // Removes a button from the launcher
    _removeAppLauncher(appId, button) {
        if (this._systemItemChild && button.get_parent() === this._systemItemChild) {
            this._systemItemChild.remove_child(button);
        }
        button.destroy();
    }

    // Changes the buttons within the launcher
    _onApplicationsChange() {
        if (!this._systemItemChild) {
            return;
        }
        const wantedApps = this._settings.get_strv('system-menu-apps');
        const wantedAppsSet = new Set(wantedApps);

        for (const appId of this._launcherButtons.keys()) {
            if (!wantedAppsSet.has(appId)) {
                this._removeAppLauncher(appId, this._launcherButtons.get(appId));
                this._launcherButtons.delete(appId);
            }
        }

        for (const appId of wantedApps) {
            if (this._launcherButtons.has(appId)) {
                continue;
            }

            const appInfo = Shell.AppSystem.get_default().lookup_app(appId);
            if (appInfo) {
                const button = new SystemMenuAppButton(appInfo);
                this._launcherButtons.set(appId, button);
                this._systemItemChild.add_child(button);
            }
        }

        this._onPositionChange();
    }

    // Moves the buttons within the launcher
    _onPositionChange() {
        if (!this._systemItemChild) {
            return;
        }

        const endPos = this._systemItemChild.get_n_children() - 1;
        for (const button of this._launcherButtons.values()) {
            this._systemItemChild.set_child_at_index(button, endPos);
        }

        let position = this._settings.get_int('system-menu-position');
        
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

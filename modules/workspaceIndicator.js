// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Workspace Indicator Feature
 *
 * This file contains all the logic for showing a
 * workspace indicator and menu in the top panel.
 */

'use strict';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const MyIndicator = GObject.registerClass(
class MyIndicator extends PanelMenu.Button {

    _init(settings) {
        super._init(0.5, 'My Workspace Indicator');

        this._settings = settings;

        const workspaceManager = global.workspace_manager;
        const workspaceNamesSetting = new Gio.Settings({ schema: 'org.gnome.desktop.wm.preferences' });
        const workspaceNames = workspaceNamesSetting.get_strv('workspace-names');
        const activeWorkspaceIndex = workspaceManager.get_active_workspace_index();
        const nWorkspaces = workspaceManager.get_n_workspaces();

        const currentWorkspaceName = workspaceNames[activeWorkspaceIndex] || _("Workspace %d").format(activeWorkspaceIndex + 1);

        const label = new St.Label({
            text: currentWorkspaceName,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(label);

        const menuHeader = new PopupMenu.PopupMenuItem('Switch to', { reactive: false });
        menuHeader.style = 'padding-top: 0px; padding-bottom: 6px; min-height: 0;';
        menuHeader.label.style = 'font-size: 0.8em; font-weight: bold; color: #c0c0c0;';
        this.menu.addMenuItem(menuHeader);

        // Get and parse the list of indices to hide
        const indicesToHideStr = this._settings.get_string('hide-workspace-indices');
        const indicesToHide = new Set(
            indicesToHideStr.split(',')
                .map(s => parseInt(s.trim()))
                .filter(n => !isNaN(n))
        );
        
        for (let i = 0; i < nWorkspaces; i++) {
            
            const isActive = (i === activeWorkspaceIndex);
            const isManuallyHidden = indicesToHide.has(i);

            if (isActive || isManuallyHidden) {
                continue;
            }

            const workspace = workspaceManager.get_workspace_by_index(i);
            if (!workspace) continue; 

            const name = workspaceNames[i] || _("Workspace %d").format(i + 1);
            const menuItem = new PopupMenu.PopupMenuItem(name);

            menuItem.connect('activate', () => {
                workspace.activate(global.get_current_time());
            });
            this.menu.addMenuItem(menuItem);
        }

        // If no other workspaces are available to switch to, display a placeholder
        if (this.menu.numMenuItems <= 1) {
            this.menu.removeAll();
            const testItem = new PopupMenu.PopupMenuItem('No hidden workspaces', { reactive: false });
            this.menu.addMenuItem(testItem);
        }
    }
});


// --- Feature Logic Class ---

export class WorkspaceIndicatorFeature {

    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
        this._indicator = null;
        this._workspaceChangedId = null;
        this._hideSettingId = null;
        this._positionSettingId = null;
        this._indexSettingId = null;
    }

    /**
     * Enables the feature, connects to settings, and applies the current setting.
     */
    enable() {
        this._settingsConnection = this._settings.connect(
            'changed::enable-workspace-indicator',
            () => this._updateWorkspaceIndicator()
        );
        
        this._hideSettingId = this._settings.connect(
            'changed::hide-workspace-indices',
            () => this._rebuildIndicator()
        );
        
        this._positionSettingId = this._settings.connect(
            'changed::workspace-indicator-position',
            () => this._rebuildIndicator()
        );
        
        this._indexSettingId = this._settings.connect(
            'changed::workspace-indicator-index',
            () => this._rebuildIndicator()
        );
        
        this._updateWorkspaceIndicator();
    }

    /**
     * Disables the feature, cleans up listeners, and destroys the indicator.
     */
    disable() {
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }
        
        if (this._hideSettingId) {
            this._settings.disconnect(this._hideSettingId);
            this._hideSettingId = null;
        }

        if (this._positionSettingId) {
            this._settings.disconnect(this._positionSettingId);
            this._positionSettingId = null;
        }
        
        if (this._indexSettingId) {
            this._settings.disconnect(this._indexSettingId);
            this._indexSettingId = null;
        }
        
        this._destroyIndicator();
    }

    /**
     * Enables or disables the workspace indicator feature based on its setting.
     */
    _updateWorkspaceIndicator() {
        if (this._settings.get_boolean('enable-workspace-indicator')) {
            if (!this._indicator) {
                this._indicator = new MyIndicator(this._settings);
                
                const position = this._settings.get_string('workspace-indicator-position');
                const index = this._settings.get_int('workspace-indicator-index');
                Main.panel.addToStatusArea('quibbles-workspace-indicator', this._indicator, index, position);
                
                // Watch for workspace changes to rebuild the indicator
                this._workspaceChangedId = global.workspace_manager.connect(
                    'active-workspace-changed',
                    this._rebuildIndicator.bind(this)
                );
            }
        } else {
            if (this._indicator) {
                this._destroyIndicator();
            }
        }
    }

    /**
     * Destroys and recreates the indicator; called when the
     * active workspace, hide list, or position settings changes.
     */
    _rebuildIndicator() {
        if (!this._indicator) return;

        this._indicator?.destroy();
        this._indicator = new MyIndicator(this._settings);
        
        const position = this._settings.get_string('workspace-indicator-position');
        const index = this._settings.get_int('workspace-indicator-index');
        Main.panel.addToStatusArea('quibbles-workspace-indicator', this._indicator, index, position);
    }

    /**
     * Cleanly destroy the workspace indicator and its signal listener.
     */
    _destroyIndicator() {
        if (this._workspaceChangedId) {
            global.workspace_manager.disconnect(this._workspaceChangedId);
            this._workspaceChangedId = null;
        }
        this._indicator?.destroy();
        this._indicator = null;
    }
}

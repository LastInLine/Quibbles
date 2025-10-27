// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Workspace Indicator Feature
 *
 * This file contains all the logic for showing a workspace
 * indicator and menu in the top panel.
 */

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

// --- Workspace Indicator UI Class ---
// This class defines the button and menu for the workspace indicator feature.
const MyIndicator = GObject.registerClass(
class MyIndicator extends PanelMenu.Button {
    /**
     * This function is called when a new instance of the indicator is created.
     * It builds the button's label and the contents of its popup menu.
     *
     * @param {Gio.Settings} settings - The extension's settings object.
     */
    _init(settings) {
        // 0.5 centers the menu under the button.
        super._init(0.5, 'My Workspace Indicator');

        // Store the settings object for later use
        this._settings = settings;

        // Get necessary managers and settings from GNOME Shell
        const workspaceManager = global.workspace_manager;
        const workspaceNamesSetting = new Gio.Settings({ schema: 'org.gnome.desktop.wm.preferences' });
        const workspaceNames = workspaceNamesSetting.get_strv('workspace-names');
        const activeWorkspaceIndex = workspaceManager.get_active_workspace_index();
        const nWorkspaces = workspaceManager.get_n_workspaces();

        // Determine the current workspace's name to use as the button's label
        const currentWorkspaceName = workspaceNames[activeWorkspaceIndex] || _("Workspace %d").format(activeWorkspaceIndex + 1);

        // Create the text label for the button
        let label = new St.Label({
            text: currentWorkspaceName,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(label);

        // --- Build the Popup Menu ---

        const menuHeader = new PopupMenu.PopupMenuItem('Switch to', { reactive: false });
        menuHeader.style = 'padding-top: 0px; padding-bottom: 6px; min-height: 0;';
        menuHeader.label.style = 'font-size: 0.8em; font-weight: bold; color: #c0c0c0;';
        this.menu.addMenuItem(menuHeader);

        // --- NEW: Get and parse the list of indices to hide ---
        const indicesToHideStr = this._settings.get_string('hide-workspace-indices');
        // Turn the string "1, 2" into a Set {1, 2} for easy lookup
        const indicesToHide = new Set(
            indicesToHideStr.split(',') // ["1", " 2"]
                .map(s => parseInt(s.trim())) // [1, 2]
                .filter(n => !isNaN(n)) // Filter out any bad text like 'a' or empty strings
        );
        // --- END NEW ---

        // Loop through all available workspaces to build the menu
        for (let i = 0; i < nWorkspaces; i++) {
            
            // --- UPDATED LOGIC ---
            const isActive = (i === activeWorkspaceIndex);
            const isManuallyHidden = indicesToHide.has(i);

            // Hide the workspace if it's the active one OR
            // if it's in our manual "hide" list.
            if (isActive || isManuallyHidden) {
                continue;
            }
            // --- END UPDATED LOGIC ---

            const workspace = workspaceManager.get_workspace_by_index(i);
            if (!workspace) continue; // Safety check

            let name = workspaceNames[i] || _("Workspace %d").format(i + 1);
            let menuItem = new PopupMenu.PopupMenuItem(name);

            // When a menu item is clicked, activate the corresponding workspace
            menuItem.connect('activate', () => {
                workspace.activate(global.get_current_time());
            });
            this.menu.addMenuItem(menuItem);
        }

        // If there are no other workspaces to show, display a placeholder.
        if (this.menu.numMenuItems <= 1) {
            this.menu.removeAll();
            let testItem = new PopupMenu.PopupMenuItem('No hidden workspaces', { reactive: false });
            this.menu.addMenuItem(testItem);
        }
    }
});


// --- Feature Logic Class ---

export class WorkspaceIndicatorFeature {
    /**
     * @param {Gio.Settings} settings - The extension's settings object.
     */
    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
        this._indicator = null;
        this._workspaceChangedId = null;
        this._hideSettingId = null;

        // --- NEW: Connections for position settings ---
        this._positionSettingId = null;
        this._indexSettingId = null;
    }

    /**
     * Enables the feature, connects to settings, and applies the current setting.
     */
    enable() {
        // Connect to the master on/off switch
        this._settingsConnection = this._settings.connect(
            'changed::enable-workspace-indicator',
            () => this._updateWorkspaceIndicator()
        );

        // NEW: Connect to the manual hide list setting.
        // If it changes, we need to force the indicator to rebuild.
        this._hideSettingId = this._settings.connect(
            'changed::hide-workspace-indices',
            () => this._rebuildIndicator()
        );

        // --- NEW: Listen for position changes ---
        this._positionSettingId = this._settings.connect(
            'changed::workspace-indicator-position',
            () => this._rebuildIndicator()
        );
        this._indexSettingId = this._settings.connect(
            'changed::workspace-indicator-index',
            () => this._rebuildIndicator()
        );
        // --- END NEW ---

        // Apply the setting immediately on startup.
        this._updateWorkspaceIndicator();
    }

    /**
     * Disables the feature, cleans up listeners, and destroys the indicator.
     */
    disable() {
        // Disconnect our settings listeners
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }
        if (this._hideSettingId) {
            this._settings.disconnect(this._hideSettingId);
            this._hideSettingId = null;
        }

        // --- NEW: Disconnect position listeners ---
        if (this._positionSettingId) {
            this._settings.disconnect(this._positionSettingId);
            this._positionSettingId = null;
        }
        if (this._indexSettingId) {
            this._settings.disconnect(this._indexSettingId);
            this._indexSettingId = null;
        }
        // --- END NEW ---

        // Cleanly destroy the indicator and its listeners.
        this._destroyIndicator();
    }

    /**
     * Enables or disables the workspace indicator feature based on its setting.
     */
    _updateWorkspaceIndicator() {
        if (this._settings.get_boolean('enable-workspace-indicator')) {
            // If the feature is enabled but the indicator doesn't exist yet, create it.
            if (!this._indicator) {
                // Pass settings to the indicator
                this._indicator = new MyIndicator(this._settings);
                
                // --- UPDATED: Use settings for position ---
                const position = this._settings.get_string('workspace-indicator-position');
                const index = this._settings.get_int('workspace-indicator-index');
                Main.panel.addToStatusArea('quibbles-workspace-indicator', this._indicator, index, position);
                // --- END UPDATE ---

                // Watch for workspace changes to rebuild the indicator with the correct label.
                this._workspaceChangedId = global.workspace_manager.connect(
                    'active-workspace-changed',
                    this._rebuildIndicator.bind(this)
                );
            }
        } else {
            // If the feature is disabled and the indicator exists, destroy it.
            if (this._indicator) {
                this._destroyIndicator();
            }
        }
    }

    /**
     * A helper to destroy and recreate the workspace indicator, called when the
     * active workspace changes OR when our hide list changes.
     */
    _rebuildIndicator() {
        // Don't rebuild if the indicator isn't enabled
        if (!this._indicator) return;

        this._indicator?.destroy();
        // Pass settings to the indicator
        this._indicator = new MyIndicator(this._settings);
        
        // --- UPDATED: Use settings for position ---
        const position = this._settings.get_string('workspace-indicator-position');
        const index = this._settings.get_int('workspace-indicator-index');
        Main.panel.addToStatusArea('quibbles-workspace-indicator', this._indicator, index, position);
        // --- END UPDATE ---
    }

    /**
     * A helper to cleanly destroy the workspace indicator and its signal listener.
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




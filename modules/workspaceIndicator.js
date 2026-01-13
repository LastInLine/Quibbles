// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

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

const PAPERWM_UUID = 'paperwm@paperwm.github.com';

// -----------------------
// --- HELPER FUNCTION ---
// -----------------------

function _getPaperWMVisibleIndices() {
    const visible = new Set();
    const paperwm = Main.extensionManager.lookup(PAPERWM_UUID);
    const modules = paperwm?.stateObj?.modules;
    const tilingMod = Array.isArray(modules) ? modules.find(m => m?.Space) : null;
    const monitors = tilingMod?.spaces?.monitors;

    if (monitors) {
        for (const space of monitors.values()) {
            if (space?.index !== undefined) {
                visible.add(space.index);
            }
        }
    }
    
    return visible;
}

// --------------------
// --- HELPER CLASS ---
// --------------------

const MyIndicator = GObject.registerClass(
class MyIndicator extends PanelMenu.Button {
    _init(settings) {
        super._init(0.5, 'My Workspace Indicator');

        this._settings = settings;
        this._workspaceManager = global.workspace_manager;
        this._wmSettings = new Gio.Settings({ schema: 'org.gnome.desktop.wm.preferences' });

        this._label = new St.Label({
            text: "...",
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.add_child(this._label);
        this._updateLabel();
        this._refreshMenu();
        this._wsSignalId = this._workspaceManager.connect(
            'active-workspace-changed', 
            () => {
                this._updateLabel();
            }
        );
 
        this._nameSignalId = this._wmSettings.connect(
            'changed::workspace-names', 
            () => {
                this._updateLabel();
            }
        );

        this.menu.connect('open-state-changed', (menu, isOpen) => {
            if (isOpen) {
                this._refreshMenu();
            }
        });
    }

    // Updates the text on the panel button
    _updateLabel() {
        const activeIndex = this._workspaceManager.get_active_workspace_index();
        const names = this._wmSettings.get_strv('workspace-names');
        const name = names[activeIndex] || _("Workspace %d").format(activeIndex + 1);
        this._label.set_text(name);
    }

    // Builds the dropdown menu content
    _refreshMenu() {
        this.menu.removeAll();

        // Header
        const headerStyle = 'padding-top: 0px; padding-bottom: 6px; min-height: 0;';
        const headerLabelStyle = 'font-size: 0.8em; font-weight: bold; color: #c0c0c0;';
        const menuHeader = new PopupMenu.PopupMenuItem('Switch to', { reactive: false });
        menuHeader.style = headerStyle;
        menuHeader.label.style = headerLabelStyle;
        this.menu.addMenuItem(menuHeader);

        const nWorkspaces = this._workspaceManager.get_n_workspaces();
        const activeIndex = this._workspaceManager.get_active_workspace_index();
        const names = this._wmSettings.get_strv('workspace-names');
        const visibleIndices = _getPaperWMVisibleIndices();
        visibleIndices.add(activeIndex);

        let addedAny = false;

        for (let i = 0; i < nWorkspaces; i++) {
            if (visibleIndices.has(i)) continue;

            const workspace = this._workspaceManager.get_workspace_by_index(i);
            if (!workspace) continue; 

            const name = names[i] || _("Workspace %d").format(i + 1);
            const menuItem = new PopupMenu.PopupMenuItem(name);

            menuItem.connect('activate', () => {
                workspace.activate(global.get_current_time());
            });
            this.menu.addMenuItem(menuItem);
            addedAny = true;
        }

        if (!addedAny) {
            this.menu.removeAll();
            const infoItem = new PopupMenu.PopupMenuItem('All workspaces visible', { reactive: false });
            this.menu.addMenuItem(infoItem);
        }
    }

    destroy() {
        if (this._wsSignalId) {
            this._workspaceManager.disconnect(this._wsSignalId);
        }
        if (this._nameSignalId) {
            this._wmSettings.disconnect(this._nameSignalId);
        }
        super.destroy();
    }
});

// --------------------
// --- EXPORT CLASS ---
// --------------------

export class WorkspaceIndicatorFeature {

    constructor(settings) {
        this._settings = settings;
        this._indicator = null;
        this._settingsConnections = [];
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------
        
    enable() {
        this._settingsConnections.push(
            this._settings.connect('changed::enable-workspace-indicator', () => this._updateState())
        );

        const rebuild = () => { if (this._indicator) this._rebuild(); };
        
        this._settingsConnections.push(
            this._settings.connect('changed::workspace-indicator-position', rebuild)
        );
        this._settingsConnections.push(
            this._settings.connect('changed::workspace-indicator-index', rebuild)
        );
 
        this._updateState();
    }

    disable() {
        this._settingsConnections.forEach(id => this._settings.disconnect(id));
        this._settingsConnections = [];
        this._destroy();
    }

    // -------------
    // --- Logic ---
    // -------------

    // Checks settings to decide whether to create or destroy the indicator
    _updateState() {
        if (this._settings.get_boolean('enable-workspace-indicator')) {
            if (!this._indicator) this._rebuild();
        } else {
            this._destroy();
        }
    }
    
    // Destroys and recreates the indicator
    _rebuild() {
        this._destroy();
        this._indicator = new MyIndicator(this._settings);
        
        const position = this._settings.get_string('workspace-indicator-position');
        const index = this._settings.get_int('workspace-indicator-index');
        Main.panel.addToStatusArea('quibbles-workspace-indicator', this._indicator, index, position);
    }

    // Safely removes the indicator from the panel
    _destroy() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

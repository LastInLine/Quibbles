import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import { WindowMenu } from 'resource:///org/gnome/shell/ui/windowMenu.js';
import St from 'gi://St';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

// --- Workspace Indicator Code ---
const MyIndicator = GObject.registerClass(
class MyIndicator extends PanelMenu.Button {
    _init() {
        super._init(0, 'My Workspace Indicator');
        const workspaceManager = global.workspace_manager;
        const workspaceNamesSetting = new Gio.Settings({ schema: 'org.gnome.desktop.wm.preferences' });
        const workspaceNames = workspaceNamesSetting.get_strv('workspace-names');
        const activeWorkspaceIndex = workspaceManager.get_active_workspace_index();
        const nWorkspaces = workspaceManager.get_n_workspaces();
        const currentWorkspaceName = workspaceNames[activeWorkspaceIndex] || _("Workspace %d").format(activeWorkspaceIndex + 1);
        let label = new St.Label({
            text: currentWorkspaceName,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(label);
        
        for (let i = 0; i < nWorkspaces; i++) {
            if (i === activeWorkspaceIndex || i === 1) { // The hardcoded hack
                continue;
            }
            const workspace = workspaceManager.get_workspace_by_index(i);
            if (!workspace) continue;
            let name = workspaceNames[i] || _("Workspace %d").format(i + 1);
            let menuItem = new PopupMenu.PopupMenuItem(name);
            menuItem.connect('activate', () => {
                workspace.activate(global.get_current_time());
            });
            this.menu.addMenuItem(menuItem);
        }
        if (this.menu.numMenuItems === 0) { 
            let testItem = new PopupMenu.PopupMenuItem('No hidden workspaces', { reactive: false });
            this.menu.addMenuItem(testItem);
        }
    }
});

let originalBuildMenu = null;

export default class QuibblesExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._settings = null;
        this._settingsConnections = [];
        this._timeoutId = null;
        
        this._activitiesButton = null;
        this._originalActivitiesState = { reactive: null, visible: null };

        this._indicator = null;
        this._workspaceChangedId = null;
    }

    _applyBarrierTweak() {
        const barrier = Main.layoutManager._rightPanelBarrier;
        if (barrier) barrier.destroy();
    }

    _updateActivitiesButton() {
        if (!this._activitiesButton) return;
        const mode = this._settings.get_string('activities-button-mode');
        switch (mode) {
            case 'unclickable':
                this._activitiesButton.visible = true;
                this._activitiesButton.reactive = false;
                break;
            case 'hidden':
                this._activitiesButton.visible = false;
                break;
            default:
                this._activitiesButton.visible = true;
                this._activitiesButton.reactive = true;
                break;
        }
    }

    _updateWorkspaceIndicator() {
        if (this._settings.get_boolean('enable-workspace-indicator')) {
            if (!this._indicator) {
                this._indicator = new MyIndicator();
                Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'left');
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
    
    _rebuildIndicator() {
        this._indicator?.destroy();
        this._indicator = new MyIndicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'left');
    }

    _destroyIndicator() {
        if (this._workspaceChangedId) {
            global.workspace_manager.disconnect(this._workspaceChangedId);
            this._workspaceChangedId = null;
        }
        this._indicator?.destroy();
        this._indicator = null;
    }


    enable() {
        this._settings = this.getSettings();
        
        this._activitiesButton = Main.panel.statusArea['activities'];
        if (this._activitiesButton) {
            this._originalActivitiesState.reactive = this._activitiesButton.reactive;
            this._originalActivitiesState.visible = this._activitiesButton.visible;
        }
        
        this._settingsConnections.push(
            this._settings.connect('changed::activities-button-mode', () => this._updateActivitiesButton()),
            this._settings.connect('changed::enable-workspace-indicator', () => this._updateWorkspaceIndicator())
        );
        this._updateActivitiesButton();
        this._updateWorkspaceIndicator();
        
        if (originalBuildMenu === null) {
            originalBuildMenu = WindowMenu.prototype._buildMenu;
            const settings = this._settings;
            WindowMenu.prototype._buildMenu = function(...args) {
                originalBuildMenu.apply(this, args);
                const visibleItems = settings.get_strv('visible-items');
                const visibleSet = new Set(visibleItems);
                this._getMenuItems().forEach(item => {
                    if (item.label) item.visible = visibleSet.has(item.label.text);
                });
            };
        }

        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            if (this._settings.get_boolean('remove-mouse-barrier')) {
                this._applyBarrierTweak();
            }
            this._timeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        this._destroyIndicator();
        
        if (originalBuildMenu) {
            WindowMenu.prototype._buildMenu = originalBuildMenu;
            originalBuildMenu = null;
        }

        if (this._activitiesButton) {
            this._activitiesButton.reactive = this._originalActivitiesState.reactive;
            this._activitiesButton.visible = this._originalActivitiesState.visible;
        }
        
        if (this._timeoutId) GLib.source_remove(this._timeoutId);
        this._settingsConnections.forEach(c => this._settings.disconnect(c));
        this._settingsConnections = [];
        
        this._settings?.run_dispose();
        this._settings = null;
    }
}



import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import { WindowMenu } from 'resource:///org/gnome/shell/ui/windowMenu.js';

// --- IMPORTS FOR WORKSPACE INDICATOR ---
import St from 'gi://St';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

let originalBuildMenu = null;

// --- WORKSPACE INDICATOR CLASS (from our canonical base) ---
const MyIndicator = GObject.registerClass(
class MyIndicator extends PanelMenu.Button {
    _init() {
        super._init(0, 'Workspace Indicator');

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
            // This is your hardcoded hack to hide the second monitor's workspace
            if (i === activeWorkspaceIndex || i === 1) {
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


export default class QuibblesExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._settings = null;
        this._settingsConnections = [];
        this._timeoutId = null;
        this._barrierDestroyed = false;
        this._originalReactiveState = null;

        // --- NEW PROPERTIES FOR WORKSPACE INDICATOR ---
        this._indicator = null;
        this._workspaceChangedId = null;
    }

    // --- NEW METHOD FOR WORKSPACE INDICATOR ---
    _toggleWorkspaceIndicator() {
        const shouldEnable = this._settings.get_boolean('enable-workspace-indicator');

        if (shouldEnable && !this._indicator) {
            // Enable the indicator
            this._indicator = new MyIndicator();
            Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'left');
            this._workspaceChangedId = global.workspace_manager.connect(
                'active-workspace-changed',
                this._rebuildIndicator.bind(this)
            );
        } else if (!shouldEnable && this._indicator) {
            // Disable the indicator
            if (this._workspaceChangedId) {
                global.workspace_manager.disconnect(this._workspaceChangedId);
                this._workspaceChangedId = null;
            }
            this._indicator?.destroy();
            this._indicator = null;
        }
    }

    // --- NEW METHOD FOR WORKSPACE INDICATOR ---
    _rebuildIndicator() {
        this._indicator?.destroy();
        this._indicator = new MyIndicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'left');
    }

    _applyBarrierTweak() {
        const barrier = Main.layoutManager._rightPanelBarrier;
        if (barrier) {
            barrier.destroy();
            this._barrierDestroyed = true;
        }
    }

    _onBarrierSettingChanged() {
        const remove = this._settings.get_boolean('remove-mouse-barrier');
        if (remove && !this._barrierDestroyed) {
            this._applyBarrierTweak();
        }
    }

    _toggleActivitiesClickable() {
        const activitiesButton = Main.panel.statusArea['activities'];
        if (!activitiesButton) return;
        
        const isUnclickable = this._settings.get_boolean('unclickable-activities-button');
        activitiesButton.reactive = !isUnclickable;
    }

    enable() {
        this._settings = this.getSettings();
        this._barrierDestroyed = false;

        const activitiesButton = Main.panel.statusArea['activities'];
        if (activitiesButton) {
            this._originalReactiveState = activitiesButton.reactive;
        }
        
        this._settingsConnections.push(
            this._settings.connect('changed::unclickable-activities-button', () => this._toggleActivitiesClickable()),
            this._settings.connect('changed::remove-mouse-barrier', () => this._onBarrierSettingChanged()),
            // --- NEW SETTING CONNECTION ---
            this._settings.connect('changed::enable-workspace-indicator', () => this._toggleWorkspaceIndicator())
        );
        this._toggleActivitiesClickable();
        // --- NEW: INITIALIZE WORKSPACE INDICATOR ---
        this._toggleWorkspaceIndicator();
        
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
        if (originalBuildMenu) {
            WindowMenu.prototype._buildMenu = originalBuildMenu;
            originalBuildMenu = null;
        }

        const activitiesButton = Main.panel.statusArea['activities'];
        if (activitiesButton && this._originalReactiveState !== null) {
            activitiesButton.reactive = this._originalReactiveState;
        }

        if (this._timeoutId) GLib.source_remove(this._timeoutId);
        this._settingsConnections.forEach(c => this._settings.disconnect(c));
        this._settingsConnections = [];
        this._originalReactiveState = null;

        // --- NEW: CLEANUP FOR WORKSPACE INDICATOR ---
        if (this._workspaceChangedId) {
            global.workspace_manager.disconnect(this._workspaceChangedId);
            this._workspaceChangedId = null;
        }
        this._indicator?.destroy();
        this._indicator = null;
        
        if (this._settings) {
            this._settings.run_dispose();
            this._settings = null;
        }
        this._barrierDestroyed = false;
    }
}


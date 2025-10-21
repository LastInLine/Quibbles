/**
 * Main logic for the "Quibbles" GNOME Shell Extension.
 * This file contains the primary classes and functions that are loaded
 * by GNOME Shell when the extension is enabled.
 */

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import { WindowMenu } from 'resource:///org/gnome/shell/ui/windowMenu.js';
import St from 'gi://St';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

// --- Workspace Indicator UI Class ---
// This class defines the button and menu for the workspace indicator feature.
const MyIndicator = GObject.registerClass(
class MyIndicator extends PanelMenu.Button {
    /**
     * This function is called when a new instance of the indicator is created.
     * It builds the button's label and the contents of its popup menu.
     */
    _init() {
        // 0.5 centers the menu under the button.
        super._init(0.5, 'My Workspace Indicator');
        
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

        // Loop through all available workspaces to build the menu
        for (let i = 0; i < nWorkspaces; i++) {
            // Hardcoded choices to hide specific workspaces from the menu
            if (i === activeWorkspaceIndex || i === 1) continue;
            
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

// --- CRASH PREVENTION GLOBALS ---
// These variables are defined outside the main class so they persist
// across multiple enable/disable cycles within the same login session
// (e.g., when the screen locks).

// Stores the original, un-patched version of the window menu function.
let originalBuildMenu = null;
// A session-wide flag to ensure we only try to destroy the panel barrier once.
let barrierDestroyedThisSession = false;

// --- Main Extension Class ---
export default class QuibblesExtension extends Extension {
    /**
     * The constructor is called once when the extension is loaded.
     * It initializes all the properties that will be used by the extension.
     */
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

    /**
     * Applies the barrier tweak. This is a destructive, one-way action
     * that can only be safely run once per session to prevent shell crashes.
     */
    _applyBarrierTweak() {
        if (!barrierDestroyedThisSession) {
            const barrier = Main.layoutManager._rightPanelBarrier;
            if (barrier) {
                barrier.destroy();
                barrierDestroyedThisSession = true; // Set the safety flag for this session.
            }
        }
    }
    
    /**
     * A gatekeeper function that checks if the barrier tweak should be applied.
     * It's called on startup and whenever the setting is changed.
     */
    _checkBarrierTweak() {
        if (this._settings.get_boolean('remove-mouse-barrier')) {
            this._applyBarrierTweak();
        }
    }

    /**
     * Updates the state of the Activities button based on the current setting.
     */
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
            default: // 'default'
                this._activitiesButton.visible = true;
                this._activitiesButton.reactive = true;
                break;
        }
    }

    /**
     * Enables or disables the workspace indicator feature based on its setting.
     */
    _updateWorkspaceIndicator() {
        if (this._settings.get_boolean('enable-workspace-indicator')) {
            if (!this._indicator) {
                this._indicator = new MyIndicator();
                Main.panel.addToStatusArea('quibbles-workspace-indicator', this._indicator, 2, 'left');
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
     * A helper to destroy and recreate the workspace indicator, called when the
     * active workspace changes to keep the label updated.
     */
    _rebuildIndicator() {
        this._indicator?.destroy();
        this._indicator = new MyIndicator();
        Main.panel.addToStatusArea('quibbles-workspace-indicator', this._indicator, 2, 'left');
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

    /**
     * The main entry point. Called when the extension is enabled by the user,
     * at login, or after the lock screen.
     */
    enable() {
        this._settings = this.getSettings();
        
        // Find the Activities button and save its original state for restoration on disable.
        this._activitiesButton = Main.panel.statusArea['activities'];
        if (this._activitiesButton) {
            this._originalActivitiesState.reactive = this._activitiesButton.reactive;
            this._originalActivitiesState.visible = this._activitiesButton.visible;
        }
        
        // Connect to changes in our settings so the UI can update automatically.
        this._settingsConnections.push(
            this._settings.connect('changed::activities-button-mode', () => this._updateActivitiesButton()),
            this._settings.connect('changed::enable-workspace-indicator', () => this._updateWorkspaceIndicator()),
            this._settings.connect('changed::remove-mouse-barrier', () => this._checkBarrierTweak())
        );
        
        // Apply all settings on startup.
        this._updateActivitiesButton();
        this._updateWorkspaceIndicator();
        
        // "Monkey-patch" the window menu to customize its items.
        // This is done only once per session to prevent errors.
        if (originalBuildMenu === null) {
            originalBuildMenu = WindowMenu.prototype._buildMenu;
            const settings = this._settings;
            WindowMenu.prototype._buildMenu = function(...args) {
                // First, run the original function to build the menu.
                originalBuildMenu.apply(this, args);
                // Then, apply our modification to hide/show items based on settings.
                const visibleItems = settings.get_strv('visible-items');
                const visibleSet = new Set(visibleItems);
                this._getMenuItems().forEach(item => {
                    if (item.label) item.visible = visibleSet.has(item.label.text);
                });
            };
        }

        // Apply the barrier tweak after a short delay. This is a workaround
        // for a race condition where the extension enables before the panel
        // barrier has been created by the shell.
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            this._checkBarrierTweak();
            this._timeoutId = null; // Clear the timer ID
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * The main exit point. Called when the extension is disabled by the user
     * or right before the screen locks.
     */
    disable() {
        // This is the key to the lock screen fix. Because the shell reloads
        // extensions after unlock, this `disable` function is called right
        // before the lock screen appears. By resetting the safety flag here,
        // we re-arm the barrier removal for when `enable` is called on unlock.
        barrierDestroyedThisSession = false;
        
        this._destroyIndicator();
        
        // Restore the original window menu function if it was patched.
        if (originalBuildMenu) {
            WindowMenu.prototype._buildMenu = originalBuildMenu;
            originalBuildMenu = null;
        }

        // Restore the Activities button to its original state.
        if (this._activitiesButton) {
            this._activitiesButton.reactive = this._originalActivitiesState.reactive;
            this._activitiesButton.visible = this._originalActivitiesState.visible;
        }
        
        // Clean up any pending timers and all settings signal listeners.
        if (this._timeoutId) GLib.source_remove(this._timeoutId);
        this._settingsConnections.forEach(c => this._settings.disconnect(c));
        this._settingsConnections = [];
        
        // Properly dispose of the settings object to prevent memory leaks and crashes.
        this._settings?.run_dispose();
        this._settings = null;
    }
}



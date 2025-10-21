/**
 * Window Menu Feature
 *
 * This file contains all the logic for "monkey-patching" the
 * window context menu to show/hide items based on user settings.
 */

import { WindowMenu } from 'resource:///org/gnome/shell/ui/windowMenu.js';

/**
 * A session-wide global variable to store the original, un-patched
 * version of the window menu's build function. This must be
 * defined outside the class so it persists across enable/disable
 * cycles (e.g., screen lock).
 */
let originalBuildMenu = null;

export class WindowMenuFeature {
    /**
     * @param {Gio.Settings} settings - The extension's settings object.
     */
    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
    }

    /**
     * Enables the feature, applies the patch, and connects to settings.
     */
    enable() {
        // "Monkey-patch" the window menu to customize its items.
        // This is done only once per session to prevent errors.
        if (originalBuildMenu === null) {
            originalBuildMenu = WindowMenu.prototype._buildMenu;
            
            // We pass 'this._settings' into the new function's scope
            // so it can be accessed when the patch runs.
            const settings = this._settings;
            
            WindowMenu.prototype._buildMenu = function(...args) {
                // First, run the original function to build the menu.
                originalBuildMenu.apply(this, args);
                
                // Then, apply our modification to hide/show items based on settings.
                const visibleItems = settings.get_strv('visible-items');
                const visibleSet = new Set(visibleItems);
                
                this._getMenuItems().forEach(item => {
                    if (item.label) {
                        item.visible = visibleSet.has(item.label.text);
                    }
                });
            };
        }

        // We must connect to the setting so that if the user
        // changes it in prefs, the menu is immediately updated.
        // We do this by "forcing" the menu to rebuild.
        this._settingsConnection = this._settings.connect(
            'changed::visible-items',
            () => this._forceMenuRebuild()
        );
    }

    /**
     * Disables the feature and restores the original menu function.
     */
    disable() {
        // Disconnect our settings listener.
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }

        // Restore the original window menu function if it was patched by us.
        if (originalBuildMenu) {
            WindowMenu.prototype._buildMenu = originalBuildMenu;
            originalBuildMenu = null;
        }
    }

    /**
     * Forces all window menus to rebuild themselves.
     * This is called when the 'visible-items' setting changes.
     * It works by finding all open windows and telling their
     * menus to... well, rebuild.
     */
    _forceMenuRebuild() {
        // This iterates over all actors (UI elements) and finds
        // all open windows, then finds their menus and rebuilds them.
        global.get_window_actors().forEach(actor => {
            let window = actor.get_meta_window();
            if (window && window._windowMenuManager) {
                window._windowMenuManager.menu._buildMenu();
            }
        });
    }
}


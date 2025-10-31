// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Window Menu Feature
 *
 * This file contains all the logic for allowing the user
 * to specify visible window titlebar context menu items.
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

    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
    }

    /**
     * Enables the feature, applies the patch, and connects to settings.
     */
    enable() {
        // Patch the window menu's build function, storing the original.
        // This is only done once, as the global flag persists.
        if (originalBuildMenu === null) {
            originalBuildMenu = WindowMenu.prototype._buildMenu;
            
            // Pass settings into the new function's scope
            const settings = this._settings;
            
            WindowMenu.prototype._buildMenu = function(...args) {
                // Run the original function to build the menu
                originalBuildMenu.apply(this, args);
                
                // Apply our modification to hide/show items based on settings
                const visibleItems = settings.get_strv('visible-items');
                const visibleSet = new Set(visibleItems);
                
                this._getMenuItems().forEach(item => {
                    if (item.label) {
                        item.visible = visibleSet.has(item.label.text);
                    }
                });
            };
        }

        // Connect to the setting to force a rebuild if items are changed
        this._settingsConnection = this._settings.connect(
            'changed::visible-items',
            () => this._forceMenuRebuild()
        );
    }

    /**
     * Disables the feature and restores the original menu function.
     */
    disable() {
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }

        // Restore the original window menu function if it was changed
        if (originalBuildMenu) {
            WindowMenu.prototype._buildMenu = originalBuildMenu;
            originalBuildMenu = null;
        }
    }

    /**
     * Forces all active window menus to rebuild, applying
     * the new 'visible-items' setting.
     */
    _forceMenuRebuild() {
        global.get_window_actors().forEach(actor => {
            let window = actor.get_meta_window();
            if (window && window._windowMenuManager) {
                window._windowMenuManager.menu._buildMenu();
            }
        });
    }
}


// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Window Menu Feature
 *
 * This file contains all the logic for allowing the user
 * to specify visible window titlebar context menu items.
 */

import { WindowMenu } from 'resource:///org/gnome/shell/ui/windowMenu.js';

// A unique key to store our patch on the prototype.
// This avoids global variables and extension conflicts.
const ORIGINAL_BUILD_MENU_KEY = '_quibblesOriginalBuildMenu';

export class WindowMenuFeature {

    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
    }

    /**
     * Enables the feature, applies the patch, and connects to settings.
     */
    enable() {
        if (WindowMenu.prototype[ORIGINAL_BUILD_MENU_KEY]) {
            console.log('Quibbles: WindowMenu already patched. Skipping.');
            return;
            }

        // Save the original function onto the prototype under a unique key
        WindowMenu.prototype[ORIGINAL_BUILD_MENU_KEY] = WindowMenu.prototype._buildMenu;
        
        // Pass settings into the new function's scope
        const settings = this._settings;
        
        WindowMenu.prototype._buildMenu = function(...args) {
            if (this._quibblesIsBuilding) return;
            
            this._quibblesIsBuilding = true;
            
            // Call the original function from the prototype
            WindowMenu.prototype[ORIGINAL_BUILD_MENU_KEY].apply(this, args);
            
            // Hide/show items based on settings
            const visibleItems = settings.get_strv('visible-items');
            const visibleSet = new Set(visibleItems);
            
            this._getMenuItems().forEach(item => {
                if (item.label) {
                    item.visible = visibleSet.has(item.label.text);
                }
            });

            this._quibblesIsBuilding = false;
        };

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

        if (WindowMenu.prototype[ORIGINAL_BUILD_MENU_KEY]) {
            WindowMenu.prototype._buildMenu = WindowMenu.prototype[ORIGINAL_BUILD_MENU_KEY];
            
            delete WindowMenu.prototype[ORIGINAL_BUILD_MENU_KEY];
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
                try {
                    window._windowMenuManager.menu._buildMenu();
                } catch (e) {
                    console.log(`Quibbles: Failed to force menu rebuild: ${e}`);
                }
            }
        });
    }
}

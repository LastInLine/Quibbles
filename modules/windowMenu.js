// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Window Menu Feature
 *
 * Completely rebuilds the window titlebar context menu to support
 * custom ordering and separators.
 *
 * ARCHITECTURE NOTE:
 * GNOME Shell does not provide a signal or API to modify the window menu
 * items before they are displayed. To achieve reordering, this module hooks
 * into the `_buildMenu` prototype. Existing items are safely detached (without
 * being destroyed) to prevent memory errors, then re-added in the
 * user-specified order.
 */

'use strict';

import { WindowMenu } from 'resource:///org/gnome/shell/ui/windowMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

let originalBuildMenu = null;

export class WindowMenuFeature {
    constructor(settings) {
        this._settings = settings;
        this._settingsConnection = null;
        this._masterToggleConnection = null;
    }

    enable() {
        if (originalBuildMenu === null) {
            originalBuildMenu = WindowMenu.prototype._buildMenu;
            
            const settings = this._settings;
            
            WindowMenu.prototype._buildMenu = function(...args) {
                // Run the original build so items are created
                originalBuildMenu.apply(this, args);

                if (!settings.get_boolean('enable-window-menu')) {
                    return;
                }

                // Instead of getting menu items via helper, access the raw box children
                // to control exactly what gets destroyed and what gets saved.
                const children = this.box.get_children(); 
                const itemMap = new Map();

                children.forEach(child => {
                    // Check if it is a menu item with a label that can be tracked
                    if (child instanceof PopupMenu.PopupBaseMenuItem && child.label && child.label.text) {
                        itemMap.set(child.label.text, child);
                        // Unparent it without destroying it so it can be reused
                        this.box.remove_child(child); 
                    } else {
                        // Destroy separators or untracked items to clear the space
                        child.destroy();
                    }
                });

                // At this point, 'this.box' is empty, but 'itemMap' holds live objects.
                const userOrder = settings.get_strv('visible-items');
                
                userOrder.forEach(name => {
                    if (name === 'SEPARATOR') {
                        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
                    } else {
                        // Retrieve the rescued item
                        const item = itemMap.get(name);
                        if (item) {
                            // Add it back. Since it was removed cleanly, 
                            // signals and logic remain intact.
                            this.addMenuItem(item);
                            itemMap.delete(name); 
                        }
                    }
                });

                // Destroy any unused leftovers to prevent memory leaks
                itemMap.forEach(item => item.destroy());
            };
        }

        this._settingsConnection = this._settings.connect(
            'changed::visible-items',
            () => this._forceMenuRebuild()
        );

        this._masterToggleConnection = this._settings.connect(
            'changed::enable-window-menu',
            () => this._forceMenuRebuild()
        );
    }

    disable() {
        if (this._settingsConnection) {
            this._settings.disconnect(this._settingsConnection);
            this._settingsConnection = null;
        }
        if (this._masterToggleConnection) {
            this._settings.disconnect(this._masterToggleConnection);
            this._masterToggleConnection = null;
        }

        if (originalBuildMenu) {
            WindowMenu.prototype._buildMenu = originalBuildMenu;
            originalBuildMenu = null;
        }
    }

    _forceMenuRebuild() {
        global.get_window_actors().forEach(actor => {
            const window = actor.get_meta_window();
            if (window && window._windowMenuManager) {
                window._windowMenuManager.menu._buildMenu();
            }
        });
    }
}

// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

/**
 * Window Menu Feature
 *
 * Rebuilds the window titlebar context menu
 * to support custom ordering and separators.
 */

'use strict';

import { WindowMenu } from 'resource:///org/gnome/shell/ui/windowMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import Gettext from 'gettext';

const { dgettext } = Gettext;
const SHELL_DOMAIN = 'gnome-shell';
const STANDARD_ACTIONS = {
    'minimize': 'Minimize',
    'unmaximize': 'Unmaximize',
    'maximize': 'Maximize',
    'move': 'Move',
    'resize': 'Resize',
    'always-on-top': 'Always on Top',
    'always-on-visible-workspace': 'Always on Visible Workspace',
    'move-to-workspace-left': 'Move to Workspace Left',
    'move-to-workspace-right': 'Move to Workspace Right',
    'move-to-workspace-up': 'Move to Workspace Up',
    'move-to-workspace-down': 'Move to Workspace Down',
    'move-to-monitor-up': 'Move to Monitor Up',
    'move-to-monitor-down': 'Move to Monitor Down',
    'move-to-monitor-left': 'Move to Monitor Left',
    'move-to-monitor-right': 'Move to Monitor Right',
    'close': 'Close',
    'hide': 'Hide',
    'screenshot': 'Take Screenshot'
};

let originalBuildMenu = null;

// --------------------
// --- EXPORT CLASS ---
// --------------------

export class WindowMenuFeature {
    constructor(settings) {
        this._settings = settings;
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

    enable() {
        if (WindowMenu.prototype._buildMenu._isQuibblesPatch) {
            console.warn("Quibbles: WindowMenu already patched. Skipping to prevent recursion.");
            return;
        }

        if (originalBuildMenu === null) {
            originalBuildMenu = WindowMenu.prototype._buildMenu;
            
            const feature = this;
            const patchedBuildMenu = function(...args) {
                if (originalBuildMenu) {
                    originalBuildMenu.apply(this, args);
                }

                if (!feature._settings.get_boolean('enable-window-menu')) return;
                
                feature._rebuildWithCustomOrder(this, feature._settings);
            };

            patchedBuildMenu._isQuibblesPatch = true; 
            
            WindowMenu.prototype._buildMenu = patchedBuildMenu;
        }
    }

    disable() {
        
        if (WindowMenu.prototype._buildMenu._isQuibblesPatch && originalBuildMenu) {
            WindowMenu.prototype._buildMenu = originalBuildMenu;
            originalBuildMenu = null;
        }
    }

    // -------------
    // --- Logic ---
    // -------------

    // Build user-defined menu
    _rebuildWithCustomOrder(menuInstance, settings) {
        const children = menuInstance.box.get_children();
        
        const lookupMap = new Map();
        const unusedItems = new Set(); 

        children.forEach(child => {
            if (child instanceof PopupMenu.PopupBaseMenuItem && child.label && child.label.text) {
                const realLabel = child.label.text;
                const cleanLabel = realLabel.replace('…', ''); 
                
                child._isStandardAction = false;

                lookupMap.set(realLabel, child);
                lookupMap.set(cleanLabel, child);
                unusedItems.add(child);
                
                for (const [stableId, enKey] of Object.entries(STANDARD_ACTIONS)) {
                    const localized = dgettext(SHELL_DOMAIN, enKey);
                    if (realLabel === localized || cleanLabel === localized) {
                        lookupMap.set(stableId, child);
                        lookupMap.set(enKey, child);
                        child._isStandardAction = true;
                    }
                }
                
                menuInstance.box.remove_child(child);
            } else {
                child.destroy();
            }
        });

        const userOrder = settings.get_strv('visible-items');
        const customPool = settings.get_strv('available-custom-items');
        const knownItems = new Set();
        const markKnown = (token) => {
            if (token !== 'SEPARATOR' && token !== 'OTHER') {
                const item = lookupMap.get(token);
                if (item) knownItems.add(item);
            }
        };

        userOrder.forEach(markKnown);
        customPool.forEach(markKnown);

        const otherItems = [];
        unusedItems.forEach(item => {
            if (!item._isStandardAction && !knownItems.has(item)) {
                otherItems.push(item);
                unusedItems.delete(item);
            }
        });

        userOrder.forEach(token => {
            if (token === 'SEPARATOR') {
                menuInstance.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            } else if (token === 'OTHER') {
                otherItems.forEach(item => menuInstance.addMenuItem(item));
            } else {
                const item = lookupMap.get(token);
                if (item && unusedItems.has(item)) {
                    menuInstance.addMenuItem(item);
                    unusedItems.delete(item); 
                }
            }
        });

        unusedItems.forEach(item => item.destroy());
    }
}

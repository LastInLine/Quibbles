// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

/**
 * Shared utility functions for the Shell Extension logic.
 */

'use strict';

import GLib from 'gi://GLib';

/**
 * Recursively searches a container for a child widget with a specific class name.
 * @param {Clutter.Actor} container - The parent widget to search
 * @param {string} className - The GObject class name to find (e.g., 'SettingsItem')
 * @returns {Clutter.Actor|null} The found widget or null
 */
export function findChildByClassName(container, className) {
    if (container.constructor && container.constructor.name === className) {
        return container;
    }

    if (container.get_children) {
        const children = container.get_children();
        for (const child of children) {
            const found = findChildByClassName(child, className);
            if (found) return found;
        }
    }
    
    return null;
}

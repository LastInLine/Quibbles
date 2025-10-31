// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Preferences window for the "Quibbles" extension.
 * This file is the main entry point, which loads all the individual
 * preference pages from the 'Prefs/' directory.
 */

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { WorkspacesPage } from './prefs/WorkspacesPage.js';
import { WindowMenuPage } from './prefs/WindowMenuPage.js';
import { LockscreenPage } from './prefs/LockscreenPage.js';
import { QuickSettingsPage } from './prefs/QuickSettingsPage.js';
import { AboutPage } from './prefs/AboutPage.js';

export default class QuibblesPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Default size for the window
        window.set_default_size(720, 930);

        const settings = this.getSettings();
        
        const workspacesPage = new WorkspacesPage(settings);
        const windowMenuPage = new WindowMenuPage(settings);
        const lockscreenPage = new LockscreenPage(settings);
        const quickSettingsPage = new QuickSettingsPage(settings);
        const aboutPage = new AboutPage(this);

        // --- Order of pages ---
        window.add(workspacesPage.page);
        window.add(windowMenuPage.page);
        window.add(lockscreenPage.page);
        window.add(quickSettingsPage.page);
        window.add(aboutPage.page);
    }
}

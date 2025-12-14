// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { TopPanelPage } from './prefs/TopPanelPage.js';
import { WindowMenuPage } from './prefs/WindowMenuPage.js';
import { LockscreenPage } from './prefs/LockscreenPage.js';
import { AboutPage } from './prefs/AboutPage.js';

export default class QuibblesPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.set_default_size(700, 780); // Width, height

        const settings = this.getSettings();
        
        const topPanelPage = new TopPanelPage(settings);
        const windowMenuPage = new WindowMenuPage(settings);
        const lockscreenPage = new LockscreenPage(settings);
        const aboutPage = new AboutPage(this);

        window.add(topPanelPage.page);
        window.add(windowMenuPage.page);
        window.add(lockscreenPage.page);
        window.add(aboutPage.page);
    }
}

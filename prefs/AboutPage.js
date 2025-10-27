// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Preferences page for "About" information.
 */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export class AboutPage {
    constructor(extension) {
        this.page = new Adw.PreferencesPage({
            title: _('About'),
            iconName: 'help-about-symbolic'
        });

        const group = new Adw.PreferencesGroup({
            title: _('About Quibbles'),
        });
        this.page.add(group);

        // Prefer 'version-name' for display, but fall back to 'version' if it doesn't exist.
        const displayVersion = extension.metadata['version-name'] || extension.metadata.version?.toString() || 'N/A';

        const versionRow = new Adw.ActionRow({
            title: _('Version'),
            subtitle: displayVersion,
        });
        group.add(versionRow);
        
        const descriptionRow = new Adw.ActionRow({
            title: _('Description'),
            subtitle: _(extension.metadata.description), // Added translation
        });
        group.add(descriptionRow);

        // --- SIMPLIFIED URL LINK ---
        // Only add the link row if a URL is actually defined in metadata.json
        if (extension.metadata.url) {
            // Make the ActionRow itself activatable
            const linkRow = new Adw.ActionRow({
                title: _('Quibbles Github'),
                subtitle: extension.metadata.url,
                activatable: true, // This makes the row clickable
            });
            
            // When the row is activated (clicked), launch the URL
            linkRow.connect('activated', () => {
                Gio.AppInfo.launch_default_for_uri(extension.metadata.url, null);
            });
            
            group.add(linkRow);
        }
    }
}

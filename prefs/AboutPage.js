// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Preferences page for "About" information.
 * This page displays metadata about the extension in a centered layout.
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export class AboutPage {
    constructor(extension) {
        // Get metadata from the extension object
        const metadata = extension.metadata;

        this.page = new Adw.PreferencesPage({
            title: _('About'),
            iconName: 'help-about-symbolic'
        });

        // --- GROUP 1: Centered Header ---
        // We create a group to hold our custom centered layout.
        const headerGroup = new Adw.PreferencesGroup();
        this.page.add(headerGroup);

        // This Box will hold and center our labels
        const headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER, // Center the box itself
            valign: Gtk.Align.CENTER,
            spacing: 12, // Space between title and description
            margin_top: 24,
            margin_bottom: 24,
        });

        // The main extension title
        const titleLabel = new Gtk.Label({
            label: metadata.name,
            halign: Gtk.Align.CENTER,
            // Use 'title-1' CSS class to make it large
            css_classes: ['title-1'], 
        });
        headerBox.append(titleLabel);

        // The extension description
        const descriptionLabel = new Gtk.Label({
            label: metadata.description,
            halign: Gtk.Align.CENTER,
            wrap: true, // Allow description to wrap to multiple lines
            css_classes: ['body'], // Standard body text style
        });
        headerBox.append(descriptionLabel);
        
        // A 'container' row is needed to add a custom widget to a group
        const headerRow = new Adw.ActionRow();
        headerRow.set_child(headerBox);
        headerGroup.add(headerRow);


        // --- GROUP 2: Details & Links ---
        const detailsGroup = new Adw.PreferencesGroup();
        this.page.add(detailsGroup);

        // --- Version Row (Info) ---
        const versionRow = new Adw.ActionRow({
            title: _('Version'),
            // Make the row un-clickable
            activatable: false,
            selectable: false, 
        });
        
        // Add the version number as a suffix widget on the right side
        versionRow.add_suffix(new Gtk.Label({
            label: metadata['version-name'],
            valign: Gtk.Align.CENTER,
            css_classes: ['dim-label'],
        }));
        detailsGroup.add(versionRow);

        // --- GitHub Row (Link) ---
        const homepageRow = new Adw.ActionRow({
            title: _('GitHub'),
            subtitle: extension.metadata.url,
            activatable: true, // Make the row clickable
        });
        
        // --- Add icon ---
        homepageRow.add_suffix(new Gtk.Image({
            icon_name: 'pan-end-symbolic',
            valign: Gtk.Align.CENTER,
        }));
        
        // Connect the click event to open the URL
        homepageRow.connect('activated', () => {
            Gio.AppInfo.launch_default_for_uri(metadata.url, null);
        });
        detailsGroup.add(homepageRow);
    }
}


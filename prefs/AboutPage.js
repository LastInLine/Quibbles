// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Preferences page for "About" information.
 * This page displays metadata about the extension in a centered layout.
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export class AboutPage {
    constructor(extension) {
        // Get metadata from the extension object
        const metadata = extension.metadata;

        this.page = new Adw.PreferencesPage({
            title: _('About'),
            iconName: 'help-about-symbolic'
        });

        const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        iconTheme.add_search_path(extension.path + '/icons');
        
        // --- GROUP 1: Centered Header ---
        const headerGroup = new Adw.PreferencesGroup();
        this.page.add(headerGroup);

        // This Box will hold and center the icon and labels
        const headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            spacing: 12,  // Space between title and description
        });

        // --- Load and add the icon ---
        const icon = new Gtk.Image({
            icon_name: 'quibbles-logo-symbolic',
            pixel_size: 200,
            margin_bottom: 12,
        });
        headerBox.append(icon);


        // --- Add the title ---
        const titleLabel = new Gtk.Label({
            label: metadata.name,
            halign: Gtk.Align.CENTER,
            css_classes: ['title-1'], 
        });
        headerBox.append(titleLabel);


        // --- Add the description ---
        const descriptionLabel = new Gtk.Label({
            label: metadata.description,
            halign: Gtk.Align.CENTER,
            wrap: true,
            css_classes: ['body'],
        });
        headerBox.append(descriptionLabel);

         const clamp = new Adw.Clamp({
            child: headerBox,
            margin_top: 96,
            margin_bottom: 24,
        });

        headerGroup.add(clamp);

        // --- GROUP 2: Details & Links ---
        const detailsGroup = new Adw.PreferencesGroup();
        this.page.add(detailsGroup);

        // --- Version Row ---
        const versionRow = new Adw.ActionRow({
            title: _('Version'),
            activatable: false,
            selectable: false, 
        });
        
        versionRow.add_suffix(new Gtk.Label({
            label: metadata['version-name'],
            valign: Gtk.Align.CENTER,
            css_classes: ['dim-label'],
        }));
        detailsGroup.add(versionRow);

        // --- GitHub Row ---
        const homepageRow = new Adw.ActionRow({
            title: _('GitHub'),
            subtitle: extension.metadata.url,
            activatable: true,
        });
        
        homepageRow.add_suffix(new Gtk.Image({
            icon_name: 'external-link-symbolic',
            valign: Gtk.Align.CENTER,
        }));
        
        homepageRow.connect('activated', () => {
            Gio.AppInfo.launch_default_for_uri(metadata.url, null);
        });
        detailsGroup.add(homepageRow);
    }
}

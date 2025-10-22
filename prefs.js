/**
 * Preferences window for the "Quibbles" extension.
 * This file defines the UI for the settings dialog, allowing users to
 * configure the extension's features.
 */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// This is the full, canonical list of all possible window menu items.
// Keeping it in one place makes it easy to manage.
const ALL_MENU_ITEMS = [
    'Scratch', 'Take Screenshot', 'Hide', 'Maximize', 'Move', 'Resize',
    'Always on Top', 'Always on Visible Workspace',
    'Move to Workspace Left', 'Move to Workspace Right',
    'Move to Monitor Left', 'Move to Monitor Right', 'Close'
];


function createSwitch(title, subtitle, settings, settingName) {
    const row = new Adw.ActionRow({ title, subtitle });
    const toggle = new Gtk.Switch({
        active: settings.get_boolean(settingName),
        valign: Gtk.Align.CENTER,
    });
    settings.bind(settingName, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
    row.add_suffix(toggle);
    row.activatable_widget = toggle;
    return row;
}


class WindowMenuPage {
    constructor(settings) {
        // Create the main page widget
        this.page = new Adw.PreferencesPage({
            title: _('Window Menu'),
            iconName: 'open-menu-symbolic'
        });
        
        // Create a group for our settings
        const group = new Adw.PreferencesGroup({
            title: _('Menu options'),
            description: _('Controls the visibility of items in the window title bar context menu.'),
        });
        this.page.add(group);
        
        ALL_MENU_ITEMS.forEach(itemName => {
            const row = new Adw.ActionRow({ title: itemName });
            group.add(row);
            const toggle = new Gtk.Switch({
                active: settings.get_strv('visible-items').includes(itemName),
                valign: Gtk.Align.CENTER,
            });
            toggle.connect('notify::active', (widget) => {
                let currentItems = settings.get_strv('visible-items');
                if (widget.active) {
                    currentItems.push(itemName);
                } else {
                    currentItems = currentItems.filter(item => item !== itemName);
                }
                settings.set_strv('visible-items', [...new Set(currentItems)]);
            });
            row.add_suffix(toggle);
            row.activatable_widget = toggle;
        });
    }
}

class TopPanelPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({
            title: _('Top Panel'),
            iconName: 'go-top-symbolic'
        });
        
        // --- GROUP 1: Workspace Indicator ---
        const wsGroup = new Adw.PreferencesGroup({
            title: _('Custom workspace indicator and switcher'),
        });
        this.page.add(wsGroup);

        wsGroup.add(createSwitch(
            'Enable Workspace Indicator',
            'Displays the current workspace name and a switcher menu.',
            settings,
            'enable-workspace-indicator'
        ));

        // Use an ActionRow to get a subtitle
        const hideIndicesRow = new Adw.ActionRow({
            title: _('Hide Workspace Indices'),
            subtitle: _('Comma-separated, zero-indexed (e.g., 1, 2)'),
        });
        
        // Create a text entry widget
        const entry = new Gtk.Entry({
            text: settings.get_string('hide-workspace-indices'),
            valign: Gtk.Align.CENTER,
            hexpand: true, // Make sure it fills the available space
        });
        
        // Bind the setting to the entry's text property
        settings.bind(
            'hide-workspace-indices', 
            entry, 
            'text', 
            Gio.SettingsBindFlags.DEFAULT
        );

        // Add the entry as a suffix widget
        hideIndicesRow.add_suffix(entry);
        // Make the entry box the "activatable" widget for the row
        hideIndicesRow.activatable_widget = entry;
        
        wsGroup.add(hideIndicesRow);

        // --- GROUP 2: Activities Button ---
        const activitiesGroup = new Adw.PreferencesGroup({
            title: _('Activities Button'),
        });
        this.page.add(activitiesGroup);

        const activitiesRow = new Adw.ComboRow({
            title: _('Activities Button Behavior'),
            model: new Gtk.StringList({ strings: [_('Default'), _('Unclickable'), _('Hidden')] }),
        });
        
        const stringMapping = ['default', 'unclickable', 'hidden'];

        const currentMode = settings.get_string('activities-button-mode');
        activitiesRow.selected = stringMapping.indexOf(currentMode);

        activitiesRow.connect('notify::selected', () => {
            const newMode = stringMapping[activitiesRow.selected];
            settings.set_string('activities-button-mode', newMode);
        });
        activitiesGroup.add(activitiesRow);
        
        // --- GROUP 3: Mouse Barrier ---
        const barrierGroup = new Adw.PreferencesGroup({
            title: _('Mouse Barrier'),
        });
        this.page.add(barrierGroup);

        barrierGroup.add(createSwitch(
            'Remove Top-Right Mouse Barrier',
            'A shell restart is required to restore barrier once removed.',
            settings,
            'remove-mouse-barrier'
        ));
    }
}

/**
 * A new class to build the "About" page.
 */
class AboutPage {
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
            subtitle: extension.metadata.description,
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


export default class QuibblesPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const topPanelPage = new TopPanelPage(settings);
        const windowMenuPage = new WindowMenuPage(settings);
        const aboutPage = new AboutPage(this);

        window.add(topPanelPage.page);
        window.add(windowMenuPage.page);
        window.add(aboutPage.page);
    }
}



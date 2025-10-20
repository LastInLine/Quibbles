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

/**
 * A global helper function to create a standard switch row.
 * This avoids repeating the same boilerplate code for every boolean setting.
 * @param {string} title - The title to display for the row.
 * @param {string} subtitle - The subtitle to display for the row.
 * @param {Gio.Settings} settings - The extension's settings object.
 * @param {string} settingName - The specific gsettings key for this switch.
 * @returns {Adw.ActionRow} The configured row widget.
 */
function createSwitch(title, subtitle, settings, settingName) {
    const row = new Adw.ActionRow({ title, subtitle });
    const toggle = new Gtk.Switch({
        active: settings.get_boolean(settingName),
        valign: Gtk.Align.CENTER,
    });
    // Binds the switch's state directly to the gsettings key.
    settings.bind(settingName, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
    row.add_suffix(toggle);
    row.activatable_widget = toggle;
    return row;
}

/**
 * A class to build the "Window Menu" page of the preferences window.
 */
class WindowMenuPage {
    constructor(settings) {
        // Create the main page widget that will be added to the window.
        this.page = new Adw.PreferencesPage({
            title: _('Window Menu'),
            iconName: 'open-menu-symbolic'
        });
        
        // Create the main page widget that will be added to the window.
        const group = new Adw.PreferencesGroup({
            title: _('Menu options'),
            description: _('Controls the visibility of items in the window title bar context menu.'),
        });
        this.page.add(group);
        
        // Loop through the master list and create a switch row for each item.
        ALL_MENU_ITEMS.forEach(itemName => {
            const row = new Adw.ActionRow({ title: itemName });
            group.add(row);
            const toggle = new Gtk.Switch({
                active: settings.get_strv('visible-items').includes(itemName),
                valign: Gtk.Align.CENTER,
            });
            
            // When a switch is toggled, manually update the string array in settings.
            toggle.connect('notify::active', (widget) => {
                let currentItems = settings.get_strv('visible-items');
                if (widget.active) {
                    // If toggled on, add the item to the array.
                    currentItems.push(itemName);
                } else {
                    // If toggled off, remove the item from the array.
                    currentItems = currentItems.filter(item => item !== itemName);
                }
                // Use a Set to remove any duplicates before saving back to settings.
                settings.set_strv('visible-items', [...new Set(currentItems)]);
            });
            row.add_suffix(toggle);
            row.activatable_widget = toggle;
        });
    }
}

/**
 * A class to build the "Top Panel" page of the preferences window.
 */
class TopPanelPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({
            title: _('Top Panel'),
            iconName: 'go-top-symbolic'
        });
        
        const group = new Adw.PreferencesGroup({
            title: _('Top panel modifications'),
        });
        this.page.add(group);

        // Create and add the switch for the Workspace Indicator.
        group.add(createSwitch(
            'Enable Workspace Indicator',
            'Displays the current workspace name and a switcher menu.',
            settings,
            'enable-workspace-indicator'
        ));

        // Create the dropdown menu for the Activities Button setting.
        const activitiesRow = new Adw.ComboRow({
            title: _('Activities Button'),
            model: new Gtk.StringList({ strings: [_('Default'), _('Unclickable'), _('Hidden')] }),
        });
        
        // Map the string values from our schema to the integer index of the dropdown.
        const stringMapping = ['default', 'unclickable', 'hidden'];

        // Set the initial selection based on the current setting.
        const currentMode = settings.get_string('activities-button-mode');
        activitiesRow.selected = stringMapping.indexOf(currentMode);

        // When the user changes the selection, update the setting.
        activitiesRow.connect('notify::selected', () => {
            const newMode = stringMapping[activitiesRow.selected];
            settings.set_string('activities-button-mode', newMode);
        });
        group.add(activitiesRow);
        
        // Create and add the switch for the mouse barrier setting.
        group.add(createSwitch(
            'Remove Mouse Barrier',
            'A shell restart is required to restore barrier once removed.',
            settings,
            'remove-mouse-barrier'
        ));
    }
}

/**
 * The main preferences class that GNOME Shell loads.
 */
export default class QuibblesPreferences extends ExtensionPreferences {
    /**
     * This function is called by GNOME Shell to build the preferences window.
     * @param {Adw.PreferencesWindow} window - The window to fill with our settings.
     */
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        
        // Create instances of our page classes.
        const topPanelPage = new TopPanelPage(settings);
        const windowMenuPage = new WindowMenuPage(settings);
        
        // Add the pages to the window. Adwaita will automatically create the sidebar.
        window.add(topPanelPage.page);
        window.add(windowMenuPage.page);
    }
}

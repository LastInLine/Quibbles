/**
 * Preferences window for the "Quibbles" extension.
 * This file defines the UI for the settings dialog, allowing users to
 * configure the extension's features.
 */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Pango from 'gi://Pango'; // <-- Added for FontDescription
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
            const row = new Adw.ActionRow({ title: _(itemName) }); // Added translation
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
            _('Enable Workspace Indicator'),
            _('Displays the current workspace name and a switcher menu.'),
            settings,
            'enable-workspace-indicator'
        ));

        // Create a row for the manual hide setting
        const hideIndicesRow = new Adw.ActionRow({
            title: _('Hide Workspaces from Menu'),
            subtitle: _('Use comma-separated, zero-indexed workspace IDs.'),
        });

        // Create the text entry widget
        const entry = new Gtk.Entry({
            text: settings.get_string('hide-workspace-indices'),
            valign: Gtk.Align.CENTER,
        });

        // Bind the entry's text to the GSetting
        settings.bind(
            'hide-workspace-indices',
            entry,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );

        hideIndicesRow.add_suffix(entry);
        hideIndicesRow.activatable_widget = entry;
        
        wsGroup.add(hideIndicesRow);

        // --- Combined Position and Index Row ---
        
        // 1. Create the main row with your new title
        const positionRow = new Adw.ActionRow({
            title: _('Indicator Position'),
        });
        
        // 2. Create a horizontal box to hold the widgets
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            valign: Gtk.Align.CENTER,
            spacing: 6, // Add some spacing between the widgets
        });

        // 3. Create the Dropdown
        const positionMapping = ['left', 'center', 'right'];
        const positionDropdown = new Gtk.DropDown({
            // Use capitalized strings for display
            model: Gtk.StringList.new([_('Left'), _('Center'), _('Right')]),
            valign: Gtk.Align.CENTER, // <-- Added for consistency
        });
        
        // Set the dropdown to the saved setting
        const currentPosition = settings.get_string('workspace-indicator-position');
        positionDropdown.set_selected(positionMapping.indexOf(currentPosition));

        // Connect the dropdown's 'notify::selected' signal to update the setting
        positionDropdown.connect('notify::selected', () => {
            // Get the lowercase value from our mapping to save to settings
            const newPosition = positionMapping[positionDropdown.selected];
            settings.set_string('workspace-indicator-position', newPosition);
        });
        
        // 4. Create the Spinner
        const indexSpinAdjustment = new Gtk.Adjustment({
            value: settings.get_int('workspace-indicator-index'),
            lower: 0,
            upper: 20,
            step_increment: 1,
        });
        
        const indexSpinner = new Gtk.SpinButton({
            adjustment: indexSpinAdjustment,
            digits: 0, // No decimals
            valign: Gtk.Align.CENTER,
        });
        
        // Bind the spinner's adjustment value directly to the setting
        settings.bind(
            'workspace-indicator-index',
            indexSpinAdjustment, // Bind to the adjustment, not the widget
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );

        // 5. Add the widgets to the box
        box.append(positionDropdown);
        box.append(indexSpinner);

        // 6. Add the box as the suffix to our main row
        positionRow.add_suffix(box);
        
        // 7. Add the new combined row to the group
        wsGroup.add(positionRow);
        
        // --- GROUP 2: Activities Button ---
        const activitiesGroup = new Adw.PreferencesGroup({
            title: _('Activities Button'),
        });
        this.page.add(activitiesGroup);

        // --- UPDATED WIDGET ---
        const activitiesRow = new Adw.ActionRow({
            title: _('Activities Button Behavior'),
        });
        
        const stringMapping = ['default', 'unclickable', 'hidden'];
        const activitiesDropdown = new Gtk.DropDown({
            model: Gtk.StringList.new([_('Default'), _('Unclickable'), _('Hidden')]),
            valign: Gtk.Align.CENTER,
        });

        const currentMode = settings.get_string('activities-button-mode');
        activitiesDropdown.set_selected(stringMapping.indexOf(currentMode));

        activitiesDropdown.connect('notify::selected', () => {
            const newMode = stringMapping[activitiesDropdown.selected];
            settings.set_string('activities-button-mode', newMode);
        });
        
        activitiesRow.add_suffix(activitiesDropdown);
        activitiesRow.set_activatable_widget(activitiesDropdown);
        activitiesGroup.add(activitiesRow);
        // --- END UPDATED WIDGET ---
        
        // --- GROUP 3: Mouse Barrier ---
        const mouseGroup = new Adw.PreferencesGroup({
            title: _('Mouse Barrier'),
        });
        this.page.add(mouseGroup);

        mouseGroup.add(createSwitch(
            _('Remove Top-Right Mouse Barrier'),
            _('A shell restart is required to restore barrier once removed.'),
            settings,
            'remove-mouse-barrier'
        ));
    }
}

/**
 * New page for Lockscreen settings.
 */
class LockscreenPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({
            title: _('Lockscreen'),
            iconName: 'system-lock-screen-symbolic'
        });

        // --- Lockscreen Clock Group ---
        const clockGroup = new Adw.PreferencesGroup({
            title: _('Lockscreen Clock'),
        });
        this.page.add(clockGroup);

        // --- Font Button ---
        const fontRow = new Adw.ActionRow({
            title: _('Clock Font'),
        });
        clockGroup.add(fontRow);

        const fontButton = new Gtk.FontButton({
            valign: Gtk.Align.CENTER,
            font: settings.get_string('font-desc'),
            use_font: false,
            use_size: false,
            level: Gtk.FontChooserLevel.FONT | Gtk.FontChooserLevel.SIZE | Gtk.FontChooserLevel.FEATURES,
        });
        
        fontRow.add_suffix(fontButton);
        fontRow.set_activatable_widget(fontButton);

        fontButton.connect('font-set', () => {
            const newFontDescString = fontButton.get_font();
            settings.set_string('font-desc', newFontDescString);
        });

        // --- Lockscreen Unblank Group ---
        const unblankGroup = new Adw.PreferencesGroup({
            title: _('Lockscreen Unblank'),
            description: _('Prevents the lock screen from fading to black.'),
        });
        this.page.add(unblankGroup);

        // Master Enable Toggle
        unblankGroup.add(createSwitch(
            _('Enable Lockscreen Unblank'),
            null,
            settings,
            'enable-unblank'
        ));

        // AC Power setting
        unblankGroup.add(createSwitch(
            _('Unblank Only on AC Power'),
            null,
            settings,
            'power'
        ));
        
        // --- UPDATED WIDGET ---
        const timeRow = new Adw.ActionRow({
            title: _('Time until blank'),
        });
        
        // These are the display names
        const timeoutStrings = [
            _('Never'), _('5 minutes'), _('10 minutes'), _('15 minutes'),
            _('30 minutes'), _('60 minutes'), _('90 minutes'), _('120 minutes')
        ];
        // These are the actual values (in seconds) to save
        const timeoutValues = [0, 300, 600, 900, 1800, 3600, 5400, 7200];
        
        const timeoutDropdown = new Gtk.DropDown({
            model: Gtk.StringList.new(timeoutStrings),
            valign: Gtk.Align.CENTER,
        });

        const currentTime = settings.get_int('time');
        const currentIndex = timeoutValues.indexOf(currentTime);
        timeoutDropdown.set_selected(currentIndex > -1 ? currentIndex : 0); // Default to 'Never' if not found

        timeoutDropdown.connect('notify::selected', () => {
            const newTimeValue = timeoutValues[timeoutDropdown.selected];
            settings.set_int('time', newTimeValue);
        });
        
        timeRow.add_suffix(timeoutDropdown);
        timeRow.set_activatable_widget(timeoutDropdown);
        unblankGroup.add(timeRow);
        // --- END UPDATED WIDGET ---
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


export default class QuibblesPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Set a default size for the window
        // We set a comfortable width and let the height adjust automatically.
        window.set_default_size(720, -1);

        const settings = this.getSettings();
        const topPanelPage = new TopPanelPage(settings);
        const windowMenuPage = new WindowMenuPage(settings);
        const lockscreenPage = new LockscreenPage(settings); // <-- Add new page
        const aboutPage = new AboutPage(this);

        window.add(topPanelPage.page);
        window.add(windowMenuPage.page);
        window.add(lockscreenPage.page); // <-- Add new page
        window.add(aboutPage.page);
    }
}



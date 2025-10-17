import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class PaperTweaksPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        window.add(page);

        // --- Top Panel Group ---
        const panelGroup = new Adw.PreferencesGroup({ title: 'Top Panel' });
        page.add(panelGroup);

        const rowBarrier = new Adw.ActionRow({ 
            title: 'Remove Mouse Barrier',
            subtitle: 'NOTE: Restoring the barrier requires logging out and back in.'
        });
        panelGroup.add(rowBarrier);
        const toggleBarrier = new Gtk.Switch({
            active: settings.get_boolean('remove-mouse-barrier'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('remove-mouse-barrier', toggleBarrier, 'active', Gio.SettingsBindFlags.DEFAULT);
        rowBarrier.add_suffix(toggleBarrier);

        const rowUnclickable = new Adw.ActionRow({ title: 'Make Activities Button Unclickable' });
        panelGroup.add(rowUnclickable);
        const toggleUnclickable = new Gtk.Switch({
            active: settings.get_boolean('unclickable-activities-button'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('unclickable-activities-button', toggleUnclickable, 'active', Gio.SettingsBindFlags.DEFAULT);
        rowUnclickable.add_suffix(toggleUnclickable);

        // --- Window Menu Group ---
        const windowGroup = new Adw.PreferencesGroup({ 
            title: 'Window Menu Items',
            description: 'Choose which items appear in the window title bar menu.'
        });
        page.add(windowGroup);

        // Get the master list of ALL possible items from the schema default value.
        // This is much more robust than a hardcoded list.
        const allPossibleItems = settings.get_default_value('visible-items').get_strv();
        
        // Loop through the master list to create a row for every possible item.
        allPossibleItems.forEach(itemName => {
            const row = new Adw.ActionRow({ title: itemName });
            windowGroup.add(row);

            const toggle = new Gtk.Switch({ valign: Gtk.Align.CENTER });
            row.add_suffix(toggle);

            // Check if the current item is in the user's saved list of visible items.
            const currentVisibleItems = settings.get_strv('visible-items');
            toggle.set_active(currentVisibleItems.includes(itemName));

            // When a toggle is flipped, update the string array in settings.
            toggle.connect('notify::active', (widget) => {
                let visibleItems = settings.get_strv('visible-items');
                if (widget.get_active()) {
                    // If toggled ON, add the item if it's not already there.
                    if (!visibleItems.includes(itemName)) {
                        visibleItems.push(itemName);
                    }
                } else {
                    // If toggled OFF, remove the item.
                    visibleItems = visibleItems.filter(item => item !== itemName);
                }
                settings.set_strv('visible-items', visibleItems);
            });
        });
    }
}

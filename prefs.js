import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

// This is the full, canonical list of all possible window menu items.
const ALL_MENU_ITEMS = [
    'Scratch', 'Take Screenshot', 'Hide', 'Maximize', 'Move', 'Resize',
    'Always on Top', 'Always on Visible Workspace',
    'Move to Workspace Left', 'Move to Workspace Right',
    'Move to Monitor Left', 'Move to Monitor Right', 'Close'
];

export default class QuibblesPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage();
        const settings = this.getSettings();

        // --- Top Panel Group ---
        const panelGroup = new Adw.PreferencesGroup({ title: 'Top Panel' });
        page.add(panelGroup);

        // Barrier Tweak
        const rowBarrier = new Adw.ActionRow({
            title: 'Remove Mouse Barrier',
            subtitle: 'NOTE: A logout is required for changes to take full effect.'
        });
        panelGroup.add(rowBarrier);
        const toggleBarrier = new Gtk.Switch({
            active: settings.get_boolean('remove-mouse-barrier'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('remove-mouse-barrier', toggleBarrier, 'active', Gio.SettingsBindFlags.DEFAULT);
        rowBarrier.add_suffix(toggleBarrier);
        rowBarrier.activatable_widget = toggleBarrier;

        // Unclickable Activities Tweak
        const rowUnclickable = new Adw.ActionRow({ title: 'Make Activities Button Unclickable' });
        panelGroup.add(rowUnclickable);
        const toggleUnclickable = new Gtk.Switch({
            active: settings.get_boolean('unclickable-activities-button'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('unclickable-activities-button', toggleUnclickable, 'active', Gio.SettingsBindFlags.DEFAULT);
        rowUnclickable.add_suffix(toggleUnclickable);
        rowUnclickable.activatable_widget = toggleUnclickable;

        // --- Window Menu Group ---
        const windowGroup = new Adw.PreferencesGroup({ title: 'Window Menu Items' });
        page.add(windowGroup);

        ALL_MENU_ITEMS.forEach(itemName => {
            const row = new Adw.ActionRow({ title: itemName });
            windowGroup.add(row);

            const toggle = new Gtk.Switch({
                active: settings.get_strv('visible-items').includes(itemName),
                valign: Gtk.Align.CENTER,
            });

            toggle.connect('notify::active', (widget) => {
                const currentItems = settings.get_strv('visible-items');
                if (widget.active) {
                    if (!currentItems.includes(itemName)) {
                        currentItems.push(itemName);
                        settings.set_strv('visible-items', currentItems);
                    }
                } else {
                    const newItems = currentItems.filter(item => item !== itemName);
                    settings.set_strv('visible-items', newItems);
                }
            });

            row.add_suffix(toggle);
            row.activatable_widget = toggle;
        });

        window.add(page);
    }
}

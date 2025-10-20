import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

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
        this.page = new Adw.PreferencesPage({
            title: _('Window Menu'),
            iconName: 'open-menu-symbolic'
        });
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
        
        const group = new Adw.PreferencesGroup({
            title: _('Top panel modifications'),
        });
        this.page.add(group);

        group.add(createSwitch(
            'Enable Workspace Indicator',
            'Displays the current workspace name and a switcher menu.',
            settings,
            'enable-workspace-indicator'
        ));

        const activitiesRow = new Adw.ComboRow({
            title: _('Activities Button'),
            model: new Gtk.StringList({ strings: [_('Default'), _('Unclickable'), _('Hidden')] }),
        });
        
        const stringMapping = ['default', 'unclickable', 'hidden'];

        const currentMode = settings.get_string('activities-button-mode');
        activitiesRow.selected = stringMapping.indexOf(currentMode);

        activitiesRow.connect('notify::selected', () => {
            const newMode = stringMapping[activitiesRow.selected];
            settings.set_string('activities-button-mode', newMode);
        });
        group.add(activitiesRow);
        
        group.add(createSwitch(
            'Remove Mouse Barrier',
            'A shell restart is required to restore barrier once removed.',
            settings,
            'remove-mouse-barrier'
        ));
    }
}

export default class QuibblesPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const topPanelPage = new TopPanelPage(settings);
        window.add(topPanelPage.page);
        const windowMenuPage = new WindowMenuPage(settings);
        window.add(windowMenuPage.page);
    }
}



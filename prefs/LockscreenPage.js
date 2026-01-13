// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { createSwitch } from './prefsUtils.js';

export class LockscreenPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({
            title: _('Lockscreen'),
            iconName: 'system-lock-screen-symbolic'
        });

        // ======================================
        // === GROUP 1: Appearance ===
        // ======================================
        const appearanceGroup = new Adw.PreferencesGroup({
            title: _('Appearance'),
        });
        this.page.add(appearanceGroup);


        // --- Clock Enable Toggle ---
        appearanceGroup.add(createSwitch(
            _('Enable Custom Clock Font'),
            null,
            settings,
            'clock-enabled'
        ));

        // --- Clock Font Selection Row ---
        const fontRow = new Adw.ActionRow({
            title: _('Custom Clock Font'),
        });
        appearanceGroup.add(fontRow);

        const fontControlsBox = new Gtk.Box({
            spacing: 12,
            valign: Gtk.Align.CENTER,
        });

        const resetButton = new Gtk.Button({
            icon_name: 'edit-undo-symbolic',
            tooltip_text: _('Reset to Default'),
            css_classes: ['flat'],
            valign: Gtk.Align.CENTER,
        });

        const fontButton = new Gtk.FontButton({
            valign: Gtk.Align.CENTER,
            font: settings.get_string('font-desc'),
            use_font: false, 
            use_size: false,
            level: Gtk.FontChooserLevel.FONT | Gtk.FontChooserLevel.SIZE | Gtk.FontChooserLevel.STYLE,
        });

        fontButton.connect('font-set', () => {
            const newFontDescString = fontButton.get_font();
            settings.set_string('font-desc', newFontDescString);
        });

        resetButton.connect('clicked', () => {
            settings.set_string('font-desc', '');
            fontButton.set_font('');
        });

        fontControlsBox.append(resetButton);
        fontControlsBox.append(fontButton);
        fontRow.add_suffix(fontControlsBox);

        settings.bind(
            'clock-enabled',
            fontRow,
            'sensitive',
            Gio.SettingsBindFlags.DEFAULT
        );
        
        // --- Wallpaper Fix Toggle ---
        appearanceGroup.add(createSwitch(
            _('Ensure Wallpaper Always Loads'),
            _('Prevents occasionally missing wallpaper in multi-monitor setups.'),
            settings,
            'fix-lockscreen-black-screen'
        ));


        // ===================================
        // === GROUP 2: Visibility ===
        // ===================================
        const timeoutGroup = new Adw.PreferencesGroup({
            title: _('Visibility'),
        });
        this.page.add(timeoutGroup);

        // --- Master Enable Toggle ---
        timeoutGroup.add(createSwitch(
            _('Delay Screen Off'),
            null,
            settings,
            'enable-timeout'
        ));

        // --- AC Power Setting ---
        const powerRow = createSwitch(
            _('Only on AC Power'),
            null,
            settings,
            'power'
        );
        timeoutGroup.add(powerRow);
        
        settings.bind(
            'enable-timeout',
            powerRow,
            'sensitive',
            Gio.SettingsBindFlags.DEFAULT
        );
        
        // --- Timeout ---
        const timeRow = new Adw.ActionRow({
            title: _('Time Until Screen Off'),
        });

        const timeoutStrings = [
            _('Never'), _('5 minutes'), _('10 minutes'), _('15 minutes'),
            _('30 minutes'), _('60 minutes'), _('90 minutes'), _('120 minutes')
        ];
        const timeoutValues = [0, 300, 600, 900, 1800, 3600, 5400, 7200];
        
        const timeoutDropdown = new Gtk.DropDown({
            model: Gtk.StringList.new(timeoutStrings),
            valign: Gtk.Align.CENTER,
        });

        const currentTime = settings.get_int('time');
        const currentIndex = timeoutValues.indexOf(currentTime);
        timeoutDropdown.set_selected(currentIndex > -1 ? currentIndex : 0); 

        timeoutDropdown.connect('notify::selected', () => {
            const newTimeValue = timeoutValues[timeoutDropdown.selected];
            settings.set_int('time', newTimeValue);
        });
        
        timeRow.add_suffix(timeoutDropdown);
        timeRow.set_activatable_widget(timeoutDropdown);
        timeoutGroup.add(timeRow);

        settings.bind(
            'enable-timeout',
            timeRow,
            'sensitive',
            Gio.SettingsBindFlags.DEFAULT
        );
    }
}

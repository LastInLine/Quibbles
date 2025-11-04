// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Preferences page for Lockscreen settings.
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { createSwitch } from './utils.js';

export class LockscreenPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({
            title: _('Lockscreen'),
            iconName: 'system-lock-screen-symbolic'
        });

        // --- GROUP 1: Lockscreen Clock ---
        const clockGroup = new Adw.PreferencesGroup({
            title: _('Lockscreen Clock'),
        });
        this.page.add(clockGroup);

        // --- Font Button ---
        const fontRow = new Adw.ActionRow({
            title: _('Custom Clock Font'),
        });
        clockGroup.add(fontRow);

        const fontButton = new Gtk.FontButton({
            valign: Gtk.Align.CENTER,
            font: settings.get_string('font-desc'),
            use_font: false, 
            use_size: false,
            level: Gtk.FontChooserLevel.FONT | Gtk.FontChooserLevel.SIZE | Gtk.FontChooserLevel.STYLE,
        });

        // --- Reset Button ---
        const resetButton = new Gtk.Button({
            icon_name: 'edit-undo-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Reset to Default'),
        });

        // --- Button Group ---
        const buttonBox = new Gtk.Box({
            spacing: 6,
            orientation: Gtk.Orientation.HORIZONTAL
        });
        buttonBox.append(resetButton);
        buttonBox.append(fontButton);

        fontRow.add_suffix(buttonBox);
        fontRow.set_activatable_widget(fontButton); 

        // --- Signal Handlers ---
        fontButton.connect('font-set', () => {
            const newFontDescString = fontButton.get_font();
            settings.set_string('font-desc', newFontDescString);
        });

        resetButton.connect('clicked', () => {
            settings.set_string('font-desc', '');
            fontButton.set_font('');
        });

        // --- GROUP 2: Lockscreen Unblank ---
        const unblankGroup = new Adw.PreferencesGroup({
            title: _('Lockscreen Unblank'),
            description: _('Delays or prevents the lock screen from fading to black.'),
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
        
        // Timeout widget
        const timeRow = new Adw.ActionRow({
            title: _('Time until blank'),
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
        unblankGroup.add(timeRow);
    }
}

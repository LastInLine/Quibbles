// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Preferences page for Top Panel (Workspaces & Activities) settings.
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { createSwitch } from './utils.js';

export class WorkspacesPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({
            title: _('Workspaces'),
            iconName: 'preferences-desktop-multitasking-symbolic'
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

        // --- Hide Workspaces from Menu ---
        const hideIndicesRow = new Adw.ActionRow({
            title: _('Hide Workspaces from Menu'),
            subtitle: _('Use comma-separated, zero-indexed workspace IDs.'),
        });

        const entry = new Gtk.Entry({
            text: settings.get_string('hide-workspace-indices'),
            valign: Gtk.Align.CENTER,
        });

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
        
        const positionRow = new Adw.ActionRow({
            title: _('Indicator Position'),
        });
        
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            valign: Gtk.Align.CENTER,
            spacing: 6,
        });

        const positionMapping = ['left', 'center', 'right'];
        const positionDropdown = new Gtk.DropDown({
            model: Gtk.StringList.new([_('Left'), _('Center'), _('Right')]),
            valign: Gtk.Align.CENTER,
        });
        
        const currentPosition = settings.get_string('workspace-indicator-position');
        positionDropdown.set_selected(positionMapping.indexOf(currentPosition));

        positionDropdown.connect('notify::selected', () => {
            const newPosition = positionMapping[positionDropdown.selected];
            settings.set_string('workspace-indicator-position', newPosition);
        });
        
        const indexSpinAdjustment = new Gtk.Adjustment({
            value: settings.get_int('workspace-indicator-index'),
            lower: 0,
            upper: 20,
            step_increment: 1,
        });
        
        const indexSpinner = new Gtk.SpinButton({
            adjustment: indexSpinAdjustment,
            digits: 0,
            valign: Gtk.Align.CENTER,
        });
        
        settings.bind(
            'workspace-indicator-index',
            indexSpinAdjustment,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );

        box.append(positionDropdown);
        box.append(indexSpinner);

        positionRow.add_suffix(box);
        
        wsGroup.add(positionRow);
        
        // --- GROUP 2: Activities Button ---
        const activitiesGroup = new Adw.PreferencesGroup({
            title: _('Activities Button'),
        });
        this.page.add(activitiesGroup);

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
    }
}


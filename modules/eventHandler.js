// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Google Calendar Feature
 *
 * This file contains all the logic to launch Google Calendar on the
 * selected date in the default browser from the Date Menu Event Button.
 */

'use strict';

import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

let _menuSignalId = null;
let _originalSetDate = null;
let _originalReloadEvents = null;
let _currentEventsSection = null;
let _settings = null;
let _settingsSignalId = null;

function _launchCurrentDate() {
    if (!_currentEventsSection || !_currentEventsSection._startDate) return;
    
    const rawDate = _currentEventsSection._startDate;
    let year, month, day;

    if (typeof rawDate.get_day_of_month === 'function') {
        year = rawDate.get_year();
        month = rawDate.get_month();
        day = rawDate.get_day_of_month();
    } else if (typeof rawDate.getFullYear === 'function') {
        year = rawDate.getFullYear();
        month = rawDate.getMonth() + 1;
        day = rawDate.getDate();
    } else {
        return;
    }

    const viewMode = _settings ? _settings.get_string('google-calendar-default-view') : 'month';
    const url = `https://calendar.google.com/calendar/r/${viewMode}/${year}/${month}/${day}`;

    const command = `google-calendar.sh "${url}"`;
    
    try {
        GLib.spawn_command_line_async(command);
    } catch (e) {
        console.error(`[Quibbles] Launch failed: ${e.message}`);
    }
}

function _patchRecursively(actor) {
    if (!actor) return;

    if (actor.has_style_class_name && actor.has_style_class_name('events-button')) {
        
        if (!actor._quibblesHijacked) {
            
            // Intercept input before the button sees it
            const id = actor.connect('captured-event', (widget, event) => {
                const type = event.type();
                
                // 1. Block the Press
                if (type === Clutter.EventType.BUTTON_PRESS || type === Clutter.EventType.TOUCH_BEGIN) {
                    return Clutter.EVENT_STOP;
                }

                // 2. Act on Release
                if (type === Clutter.EventType.BUTTON_RELEASE || type === Clutter.EventType.TOUCH_END) {
                     if (event.get_button() === 1) {
                        Main.panel.statusArea.dateMenu.menu.close();
                        _launchCurrentDate();
                        return Clutter.EVENT_STOP;
                     }
                }
                
                return Clutter.EVENT_PROPAGATE;
            });

            actor._quibblesHijacked = true;
            actor._quibblesSignalId = id; // Store ID for cleanup
        }
    }

    if (actor.get_children) {
        actor.get_children().forEach(child => _patchRecursively(child));
    }
}

// New helper to remove the interceptors
function _cleanupHandlers(actor) {
    if (!actor) return;

    // specific check: if we hijacked it, disconnect and clean up
    if (actor._quibblesHijacked && actor._quibblesSignalId) {
        actor.disconnect(actor._quibblesSignalId);
        actor._quibblesHijacked = false;
        actor._quibblesSignalId = null;
    }

    if (actor.get_children) {
        actor.get_children().forEach(child => _cleanupHandlers(child));
    }
}

function _updateView() {
    if (!_currentEventsSection) return;
    _patchRecursively(_currentEventsSection);
}

function _installHooks() {
    if (_settings && !_settings.get_boolean('google-calendar-handler-enabled')) return;

    const dateMenu = Main.panel.statusArea.dateMenu;
    if (!dateMenu || !dateMenu._eventsItem) return;

    _currentEventsSection = dateMenu._eventsItem;

    _updateView();

    // Hook setDate to re-patch when calendar navigation happens
    if (typeof _currentEventsSection.setDate === 'function' && !_currentEventsSection.setDate._isQuibblesPatch) {
        _originalSetDate = _currentEventsSection.setDate;
        _currentEventsSection.setDate = function(date) {
            if (_originalSetDate) _originalSetDate.call(this, date);
            _updateView();
        };
        _currentEventsSection.setDate._isQuibblesPatch = true;
    }

    // Hook _reloadEvents for internal updates
    if (typeof _currentEventsSection._reloadEvents === 'function' && !_currentEventsSection._reloadEvents._isQuibblesPatch) {
        _originalReloadEvents = _currentEventsSection._reloadEvents;
        _currentEventsSection._reloadEvents = function() {
            if (_originalReloadEvents) _originalReloadEvents.call(this);
            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                _updateView();
                return GLib.SOURCE_REMOVE;
            });
        };
        _currentEventsSection._reloadEvents._isQuibblesPatch = true;
    }
}

function _removeHooks() {
    const dateMenu = Main.panel.statusArea.dateMenu;
    if (dateMenu && dateMenu.menu && _menuSignalId) {
        dateMenu.menu.disconnect(_menuSignalId);
        _menuSignalId = null;
    }
    
    if (_currentEventsSection) {
        // 1. Clean up our captured-event handlers
        _cleanupHandlers(_currentEventsSection);

        // 2. Restore original methods
        if (_originalSetDate) {
            _currentEventsSection.setDate = _originalSetDate;
            _originalSetDate = null;
        }
        if (_originalReloadEvents) {
            _currentEventsSection._reloadEvents = _originalReloadEvents;
            _originalReloadEvents = null;
        }
        
        // 3. Force a reload to ensure UI state is clean (optional but safe)
        if (_currentEventsSection._reloadEvents) {
             try { _currentEventsSection._reloadEvents(); } catch{}
        }
    }
    _currentEventsSection = null;
}

export function enable(settings) {
    _settings = settings;

    if (_settings) {
        _settingsSignalId = _settings.connect('changed::google-calendar-handler-enabled', () => {
            if (_settings.get_boolean('google-calendar-handler-enabled')) {
                const dateMenu = Main.panel.statusArea.dateMenu;
                if (dateMenu && dateMenu.menu && !_menuSignalId) {
                    _menuSignalId = dateMenu.menu.connect('open-state-changed', (menu, isOpen) => {
                        if (isOpen) _installHooks();
                    });
                }
            } else {
                _removeHooks();
            }
        });
    }

    if (_settings && !_settings.get_boolean('google-calendar-handler-enabled')) return;

    const dateMenu = Main.panel.statusArea.dateMenu;
    if (dateMenu && dateMenu.menu) {
        _menuSignalId = dateMenu.menu.connect('open-state-changed', (menu, isOpen) => {
            if (isOpen) _installHooks();
        });
    }
}

export function disable() {
    if (_settings && _settingsSignalId) {
        _settings.disconnect(_settingsSignalId);
        _settingsSignalId = null;
    }
    _settings = null;
    _removeHooks();
}

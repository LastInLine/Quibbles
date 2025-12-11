// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

/**
 * Google Calendar Feature
 *
 * Launches Google Calendar on the selected date in the default browser.
 */

'use strict';

import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class EventHandler {
    constructor(settings) {
        this._settings = settings;
        this._menuSignalId = null;
        this._settingsSignalId = null;
        this._currentEventsSection = null;
        this._originalSetDate = null;
        this._originalReloadEvents = null;
    }

    enable() {
        this._settingsSignalId = this._settings.connect(
            'changed::google-calendar-handler-enabled',
            () => this._syncState()
        );

        this._syncState();
    }

    disable() {
        if (this._settingsSignalId) {
            this._settings.disconnect(this._settingsSignalId);
            this._settingsSignalId = null;
        }

        this._removeHooks();
    }

    _syncState() {
        const isEnabled = this._settings.get_boolean('google-calendar-handler-enabled');
        
        if (isEnabled) {
            const dateMenu = Main.panel.statusArea.dateMenu;
            if (dateMenu && dateMenu.menu && !this._menuSignalId) {
                this._menuSignalId = dateMenu.menu.connect('open-state-changed', (menu, isOpen) => {
                    if (isOpen) this._installHooks();
                });
            }
        } else {
            this._removeHooks();
        }
    }

    _installHooks() {
        const dateMenu = Main.panel.statusArea.dateMenu;
        if (!dateMenu || !dateMenu._eventsItem) return;

        this._currentEventsSection = dateMenu._eventsItem;
        
        this._updateView();

        if (typeof this._currentEventsSection.setDate === 'function' && !this._currentEventsSection.setDate._isQuibblesPatch) {
            this._originalSetDate = this._currentEventsSection.setDate;
            this._currentEventsSection.setDate = (date) => {
                if (this._originalSetDate) this._originalSetDate.call(this._currentEventsSection, date);
                this._updateView();
            };
            this._currentEventsSection.setDate._isQuibblesPatch = true;
        }

        if (typeof this._currentEventsSection._reloadEvents === 'function' && !this._currentEventsSection._reloadEvents._isQuibblesPatch) {
            this._originalReloadEvents = this._currentEventsSection._reloadEvents;
            this._currentEventsSection._reloadEvents = () => {
                if (this._originalReloadEvents) this._originalReloadEvents.call(this._currentEventsSection);
                
                // Wait for the UI to rebuild, then patch again
                GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                    this._updateView();
                    return GLib.SOURCE_REMOVE;
                });
            };
            this._currentEventsSection._reloadEvents._isQuibblesPatch = true;
        }
    }

    _removeHooks() {
        const dateMenu = Main.panel.statusArea.dateMenu;
        
        if (dateMenu && dateMenu.menu && this._menuSignalId) {
            dateMenu.menu.disconnect(this._menuSignalId);
            this._menuSignalId = null;
        }
        
        if (this._currentEventsSection) {
            this._cleanupHandlers(this._currentEventsSection);
            
            if (this._originalSetDate) {
                this._currentEventsSection.setDate = this._originalSetDate;
                this._originalSetDate = null;
            }
            
            if (this._originalReloadEvents) {
                this._currentEventsSection._reloadEvents = this._originalReloadEvents;
                this._originalReloadEvents = null;
            }
            
            // Force a reload so the UI goes back to normal
            // Try-catch in case internal methods change
            try { 
                if (this._currentEventsSection._reloadEvents) {
                    this._currentEventsSection._reloadEvents(); 
                }
            } catch (e) {
                console.warn(`[Quibbles] Cleanup reload warning: ${e.message}`);
            }
        }
        this._currentEventsSection = null;
    }

    _updateView() {
        if (!this._currentEventsSection) return;
        this._patchRecursively(this._currentEventsSection);
    }

    _patchRecursively(actor) {
        if (!actor) return;

        if (actor.has_style_class_name && actor.has_style_class_name('events-button')) {
            if (!actor._quibblesHijacked) {

                // This prevents the button from performing default behavior
                const id = actor.connect('captured-event', (widget, event) => {
                    const type = event.type();
                    
                    if (type === Clutter.EventType.BUTTON_PRESS || type === Clutter.EventType.TOUCH_BEGIN) {
                        return Clutter.EVENT_STOP;
                    }

                    if (type === Clutter.EventType.BUTTON_RELEASE || type === Clutter.EventType.TOUCH_END) {
                         if (event.get_button() === 1) {
                            Main.panel.statusArea.dateMenu.menu.close();
                            this._launchCurrentDate();
                            return Clutter.EVENT_STOP;
                         }
                    }
                    
                    return Clutter.EVENT_PROPAGATE;
                });

                actor._quibblesHijacked = true;
                actor._quibblesSignalId = id; 
            }
        }

        if (actor.get_children) {
            actor.get_children().forEach(child => this._patchRecursively(child));
        }
    }

    _cleanupHandlers(actor) {
        if (!actor) return;

        if (actor._quibblesHijacked && actor._quibblesSignalId) {
            actor.disconnect(actor._quibblesSignalId);
            actor._quibblesHijacked = false;
            actor._quibblesSignalId = null;
        }

        if (actor.get_children) {
            actor.get_children().forEach(child => this._cleanupHandlers(child));
        }
    }

    _launchCurrentDate() {
        if (!this._currentEventsSection || !this._currentEventsSection._startDate) return;
        
        const rawDate = this._currentEventsSection._startDate;
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

        const viewMode = this._settings.get_string('google-calendar-default-view');
        const url = `https://calendar.google.com/calendar/r/${viewMode}/${year}/${month}/${day}`;

        try {
            Gio.AppInfo.launch_default_for_uri(url, null);
        } catch (e) {
            console.error(`[Quibbles] Failed to send Google Calendar URL: ${e.message}`);
        }
    }
}

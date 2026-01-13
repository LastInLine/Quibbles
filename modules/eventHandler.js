// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

/**
 * Google Calendar Feature
 *
 * Intercepts the "Open in Calendar" button in the GNOME Date Menu
 * and redirects it to a Google Calendar URL.
 */

'use strict';

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// --------------------
// --- EXPORT CLASS ---
// --------------------

export class EventHandler {
    constructor(settings) {
        this._settings = settings;
        this._settingsSignalId = null;
        
        this._targetSection = null;
        this._menuSignalId = null;
        
        this._layoutSignalId = null;
        this._hijackSignalId = null;
        this._hijackedButton = null;

        this._lastKnownDate = null;

        this._originals = {
            setDate: null,
            reloadEvents: null
        };
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

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
        this._teardownHooks();
    }

    // -------------
    // --- Logic ---
    // -------------

    // Identifies whether the feature is enabled
    _syncState() {
        const isEnabled = this._settings.get_boolean('google-calendar-handler-enabled');
        if (isEnabled) {
            this._setupHooks();
        } else {
            this._teardownHooks();
        }
    }

    // Connects initial listeners to the Date Menu
    _setupHooks() {
        if (this._targetSection) return;

        const dateMenu = Main.panel.statusArea.dateMenu;
        if (!dateMenu) return;

        if (!this._menuSignalId) {
            this._menuSignalId = dateMenu.menu.connect('open-state-changed', (menu, isOpen) => {
                if (isOpen) {
                    this._injectPatches(dateMenu);
                    if (!this._lastKnownDate) {
                        this._lastKnownDate = new Date(); 
                    }
                }
            });
        }
        this._injectPatches(dateMenu);
    }

    // Removes all hooks, signals, and restores original functions
    _teardownHooks() {
        this._removeButtonHijack();
        this._stopListeningForLayout();

        const dateMenu = Main.panel.statusArea.dateMenu;
        if (dateMenu && dateMenu.menu && this._menuSignalId) {
            dateMenu.menu.disconnect(this._menuSignalId);
            this._menuSignalId = null;
        }

        if (this._targetSection) {
            if (this._originals.setDate) {
                this._targetSection.setDate = this._originals.setDate;
                this._originals.setDate = null;
            }
            if (this._originals.reloadEvents) {
                this._targetSection._reloadEvents = this._originals.reloadEvents;
                this._originals.reloadEvents = null;
            }
            
            if (this._targetSection.has_allocation() && typeof this._targetSection._reloadEvents === 'function') {
                this._targetSection._reloadEvents();
            }
            
            this._targetSection = null;
        }
        this._lastKnownDate = null;
    }

    // Overwrites GNOME methods to intercept date changes and UI rebuilds
    _injectPatches(dateMenu) {
        if (this._targetSection || !dateMenu._eventsItem) return;

        this._targetSection = dateMenu._eventsItem;

        this._originals.setDate = this._targetSection.setDate;
        this._targetSection.setDate = (date) => {
            this._lastKnownDate = date; // Capture date state
            if (this._originals.setDate) {
                this._originals.setDate.call(this._targetSection, date);
            }
            this._startListeningForLayout();
        };

        this._originals.reloadEvents = this._targetSection._reloadEvents;
        this._targetSection._reloadEvents = () => {
            this._removeButtonHijack();

            if (this._originals.reloadEvents) {
                this._originals.reloadEvents.call(this._targetSection);
            }
            this._startListeningForLayout();
        };

        this._startListeningForLayout();
    }

    // Begins listening for the UI to redraw
    _startListeningForLayout() {
        if (this._layoutSignalId || !this._targetSection) return;
        if (this._hijackButton()) return;

        this._layoutSignalId = this._targetSection.connect('notify::allocation', () => {
            const success = this._hijackButton();
            if (success) {
                this._stopListeningForLayout();
            }
        });
    }

    // Stops listening for UI redraws
    _stopListeningForLayout() {
        if (this._layoutSignalId && this._targetSection) {
            this._targetSection.disconnect(this._layoutSignalId);
            this._layoutSignalId = null;
        }
    }

    // Locates the button and attaches the click interceptor
    _hijackButton() {
        if (!this._targetSection) return false;

        const button = this._findChildByClass(this._targetSection, 'events-button');

        if (button && this._hijackedButton && button !== this._hijackedButton) {
            this._removeButtonHijack();
        }

        if (button && !button._quibblesHijacked) {
            this._hijackedButton = button;
            
            this._hijackSignalId = button.connect('captured-event', (actor, event) => {
                const type = event.type();
                if (type === Clutter.EventType.BUTTON_PRESS || type === Clutter.EventType.TOUCH_BEGIN) {
                    return Clutter.EVENT_STOP;
                }
                if (type === Clutter.EventType.BUTTON_RELEASE || type === Clutter.EventType.TOUCH_END) {
                    if (event.get_button() === 1) {
                        Main.panel.statusArea.dateMenu.menu.close();
                        this._launchGoogleCalendar();
                        return Clutter.EVENT_STOP;
                    }
                }
                return Clutter.EVENT_PROPAGATE;
            });

            this._destroySignalId = button.connect('destroy', () => {
                this._hijackedButton = null;
                this._hijackSignalId = null;
                this._destroySignalId = null;
            });
            
            button._quibblesHijacked = true;
            return true; 
        }
        
        if (button && button._quibblesHijacked) return true;

        return false;
    }

    // Explicitly disconnects the hijack signal
    _removeButtonHijack() {
        if (this._hijackedButton) {
            
            if (this._hijackSignalId) {
                this._hijackedButton.disconnect(this._hijackSignalId);
            }
            
            if (this._destroySignalId) {
                this._hijackedButton.disconnect(this._destroySignalId);
            }

            if (this._hijackedButton._quibblesHijacked) {
                delete this._hijackedButton._quibblesHijacked;
            }
        }

        this._hijackedButton = null;
        this._hijackSignalId = null;
        this._destroySignalId = null;
    }

    // Recursive search helper to find the specific button actor
    _findChildByClass(actor, className) {
        if (!actor) return null;

        if (actor.has_style_class_name && actor.has_style_class_name(className)) {
            return actor;
        }

        if (actor.get_children) {
            const children = actor.get_children();
            for (const child of children) {
                const result = this._findChildByClass(child, className);
                if (result) return result;
            }
        }
        return null;
    }

    // Constructs the URL from cached state and launches browser
    _launchGoogleCalendar() {
        const date = this._lastKnownDate;
        if (!date) return;

        let year, month, day;

        // Support GLib.DateTime
        if (typeof date.get_year === 'function') {
            year = date.get_year();
            month = date.get_month();
            day = date.get_day_of_month();
        } 
        // Support standard JS Date
        else if (typeof date.getFullYear === 'function') {
            year = date.getFullYear();
            month = date.getMonth() + 1;
            day = date.getDate();
        } 
        else {
            return;
        }

        const viewMode = this._settings.get_string('google-calendar-default-view');
        const url = `https://calendar.google.com/calendar/r/${viewMode}/${year}/${month}/${day}`;
        
        Gio.AppInfo.launch_default_for_uri(url, null);
    }
}

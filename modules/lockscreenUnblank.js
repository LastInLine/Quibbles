// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

// Contains logic adapted from gnome-shell-extension-unblank by 
// Xiaoguang Wang (sun.wxg@gmail.com) also known as the GNOME extension
// "Unblank Lockscreen" which is licensed under the MIT License.

/**
 * Lockscreen Unblank Feature
 *
 * Keeps lockscreen visible for a user-specified length of time
 * by patching the GNOME ScreenShield logic.
 */

'use strict';

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as Overview from 'resource:///org/gnome/shell/ui/overview.js';
import { loadInterfaceXML } from 'resource:///org/gnome/shell/misc/fileUtils.js';
// ------------------------------------------------------------------------------
// DBus interface for battery status
const UPowerIface = loadInterfaceXML('org.freedesktop.UPower');
const UPowerProxy = Gio.DBusProxy.makeProxyWrapper(UPowerIface);
// DBus interface for monitor power
const BUS_NAME = 'org.gnome.Mutter.DisplayConfig';
const OBJECT_PATH = '/org/gnome/Mutter/DisplayConfig';
// DBus Introspection XML to define PowerSaveMode
const DisplayConfigIface = `
<node>
<interface name="org.gnome.Mutter.DisplayConfig">
    <property name="PowerSaveMode" type="i" access="readwrite"/>
</interface>
</node>`;
const DisplayConfigProxy = Gio.DBusProxy.makeProxyWrapper(DisplayConfigIface);
// ------------------------------------------------------------------------------

// -----------------------
// --- HELPER CLASS #1 ---
// -----------------------

class UnblankEngine {
    constructor(settings) {
        this._settings = settings;
        
        // --- State Variables ---
        this._hideLightboxId = 0;
        this._turnOffMonitorId = 0;
        this._inLock = false;
        this._activeOnce = false;
        this._isOnBattery = false;

        // --- Hardware Connections ---
        this._proxy = new DisplayConfigProxy(Gio.DBus.session, BUS_NAME, OBJECT_PATH, () => {});

        this._powerProxy = new UPowerProxy(Gio.DBus.system,
            'org.freedesktop.UPower',
            '/org.freedesktop.UPower',
            (proxy, error) => {
                if (error) {
                    console.error(`[Quibbles] LockscreenUnblank UPower Error: ${error.message}`);
                    return;
                }
                this._powerProxy.connect('g-properties-changed', () => this._onPowerChanged());
                this._onPowerChanged();
            });

        // --- Save Originals ---
        this._originals = {
            setActive: Main.screenShield._setActive,
            activateFade: Main.screenShield._activateFade,
            resetLockScreen: Main.screenShield._resetLockScreen,
            onUserBecameActive: Main.screenShield._onUserBecameActive,
        };
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

    enable() {
        const me = this;

        Main.screenShield._setActive = function(active) {
            me._handleSetActive(this, active);
        };

        Main.screenShield._activateFade = function(lightbox, time) {
            me._handleActivateFade(this, lightbox, time);
        };

        Main.screenShield._resetLockScreen = function(params) {
            me._handleResetLockScreen(this, params);
        };

        Main.screenShield._onUserBecameActive = function() {
            me._handleUserBecameActive(this);
        };
    }

    disable() {
        Main.screenShield._setActive = this._originals.setActive;
        Main.screenShield._activateFade = this._originals.activateFade;
        Main.screenShield._resetLockScreen = this._originals.resetLockScreen;
        Main.screenShield._onUserBecameActive = this._originals.onUserBecameActive;
        
        this._deactivateTimer();
    }

    // -------------
    // --- Logic ---
    // -------------

    // Determines if the feature should run based on power supply
    _isUnblank() {
        this._isOnBattery = (this._settings.get_boolean('power') && this._powerProxy.OnBattery);
        return !this._isOnBattery;
    }

    // Handles battery state changes
    _onPowerChanged() {
        this._isOnBattery = (this._settings.get_boolean('power') && this._powerProxy.OnBattery);

        if (Main.screenShield._isActive) {
            if (this._isOnBattery) {
                Main.screenShield.emit('active-changed');
                Main.screenShield.activate(false);
                this._activeOnce = true;
            } else {
                this._turnOnMonitor();
            }
        }
    }

    // Wake the monitor
    _turnOnMonitor() {
        if (this._proxy) this._proxy.PowerSaveMode = 0;
    }

    // Starts the countdown
    _activateTimer() {
        this._deactivateTimer();
        const timer = this._settings.get_int('time');
        
        if (timer !== 0) {
            this._turnOffMonitorId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, timer, () => {
                this._changeToBlank();
                this._turnOffMonitorId = 0;
                return GLib.SOURCE_REMOVE;
            });
            GLib.Source.set_name_by_id(this._turnOffMonitorId, '[gnome-shell] quibbles.lockscreen._turnOffMonitor');
        }
    }

    // Stops the countdown
    _deactivateTimer() {
        if (this._turnOffMonitorId !== 0) {
            GLib.source_remove(this._turnOffMonitorId);
            this._turnOffMonitorId = 0;
        }
    }

    // Blanks the screen
    _changeToBlank() {
        if (!this._activeOnce) {
            Main.screenShield.emit('active-changed');
            this._activeOnce = true;
        }
    }

    // ----------------------
    // --- Patch Handlers ---
    // ----------------------
    
    // Determines whether or not lockscreen should be unblanked on session change
    _handleSetActive(shield, active) {
        const prevIsActive = shield._isActive;
        shield._isActive = active;
        this._inLock = active;

        if (prevIsActive !== shield._isActive) {
            if (!this._isUnblank() || this._activeOnce) {
                shield.emit('active-changed');
                this._activeOnce = false;
            }
        }
        
        if (active) {
            this._activateTimer();
        } else {
            this._deactivateTimer();
        }
        shield._syncInhibitor();
    }

    // Controls the lightbox animation and delay before it occurs
    _handleActivateFade(shield, lightbox, time) {
        if (this._inLock) {
            this._activateTimer();
            return;
        }

        Main.uiGroup.set_child_above_sibling(lightbox, null);
        
        if (this._isUnblank() && !shield._isActive) {
            lightbox.lightOn(time);
            
            this._hideLightboxId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, time + 1000, () => { 
                lightbox.lightOff();
                this._activateTimer();
                this._hideLightboxId = 0;
                return GLib.SOURCE_REMOVE; 
            });
            
        } else {
            lightbox.lightOn(time);
        }

        if (shield._becameActiveId === 0) {
            shield._becameActiveId = shield.idleMonitor.add_user_active_watch(
                shield._onUserBecameActive.bind(shield)
            );
        }
    }

    // Kills the timer when the user wakes the screen
    _handleUserBecameActive(shield) {
        this._originals.onUserBecameActive.call(shield);

        if (shield._becameActiveId !== 0) {
            shield.idleMonitor.remove_watch(shield._becameActiveId);
            shield._becameActiveId = 0;
        }

        if (this._hideLightboxId !== 0) {
            GLib.source_remove(this._hideLightboxId);
            this._hideLightboxId = 0;
        }

        if (shield._isActive || shield._isLocked) {
            shield._longLightbox.lightOff();
            shield._shortLightbox.lightOff();
        } else {
            shield.deactivate(false);
        }
    }
    
    // Handles the lockscreen animation
    _handleResetLockScreen(shield, params) {
        this._activateTimer();
        
        if (shield._lockScreenState !== MessageTray.State.HIDDEN) return;

        shield._lockScreenGroup.show();
        shield._lockScreenState = MessageTray.State.SHOWING;

        const shouldUnblank = this._isUnblank();
        const fadeToBlack = shouldUnblank ? false : params.fadeToBlack;

        if (params.animateLockScreen) {
            shield._lockDialogGroup.translation_y = -global.screen_height;
            shield._lockDialogGroup.remove_all_transitions();
            shield._lockDialogGroup.ease({
                translation_y: 0,
                duration: Overview.ANIMATION_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    if (!shield._lockDialogGroup || !shield._lockScreenShown) return;

                    shield._lockScreenShown({ fadeToBlack, animateFade: true });
                },
            });
        } else {
            shield._lockDialogGroup.translation_y = 0;
            shield._lockScreenShown({ fadeToBlack, animateFade: false });
        }

        shield._dialog.grab_key_focus();
    }
}

// --------------------
// --- EXPORT CLASS ---
// --------------------

export default class LockscreenUnblankFeature {
    constructor() {
        this._engine = null;
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

    enable(settings) {
        if (this._engine) return;
        this._engine = new UnblankEngine(settings);
        this._engine.enable();
    }

    disable() {
        if (this._engine) {
            this._engine.disable();
            this._engine = null;
        }
    }
}

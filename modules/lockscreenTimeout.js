// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

// Contains logic adapted from gnome-shell-extension-unblank by 
// Xiaoguang Wang (sun.wxg@gmail.com) also known as the GNOME extension
// "Unblank Lockscreen" which is licensed under the MIT License.

/**
 * Lockscreen Timeout Feature
 *
 * Keeps lockscreen visible for a user-specified length
 * of time by patching the GNOME ScreenShield logic.
 */

'use strict';

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// -----------------
// --- Constants ---
// -----------------

const ANIMATION_TIME = 250;
const LockScreenState = {
    HIDDEN: 0,
    SHOWING: 1,
    SHOWN: 2,
    HIDING: 3
};

// -----------------------
// --- DBus Interfaces ---
// -----------------------

const UPowerIface = `
<node>
  <interface name="org.freedesktop.UPower">
    <property name="OnBattery" type="b" access="read"/>
  </interface>
</node>`;
const UPowerProxy = Gio.DBusProxy.makeProxyWrapper(UPowerIface);

const DisplayConfigIface = `
<node>
  <interface name="org.gnome.Mutter.DisplayConfig">
    <property name="PowerSaveMode" type="i" access="readwrite"/>
  </interface>
</node>`;
const DisplayConfigProxy = Gio.DBusProxy.makeProxyWrapper(DisplayConfigIface);

// --------------------
// --- EXPORT CLASS ---
// --------------------

export default class LockscreenTimeoutFeature {
    constructor() {
        this._settings = null;
        this._displayProxy = null;
        this._powerProxy = null;
        
        // Signal and Source IDs
        this._powerSignalId = 0;
        this._screenOffTimerId = 0;
        this._fadeRestoreTimerId = 0;

        // State
        this._isOnBattery = false;
        this._hasDeferredPowerOff = false; 
        this._isShieldActive = false;      

        // Original GNOME method storage
        this._originals = {
            setActive: null,
            activateFade: null,
            resetLockScreen: null,
            onUserBecameActive: null,
        };
    }

    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------

    enable(settings) {
        if (this._settings) return;
        this._settings = settings;

        this._connectHardwareProxies();
        this._injectHooks();
    }

    disable() {
        if (!this._settings) return;

        this._restoreHooks();
        this._disconnectHardwareProxies();
        this._clearTimers();
        this._settings = null;
        this._hasDeferredPowerOff = false;
        this._isShieldActive = false;
    }

    // ------------------------------
    // --- Hardware & State Logic ---
    // ------------------------------

    // Connects to DBus interfaces for monitor control and battery status
    _connectHardwareProxies() {
        this._displayProxy = new DisplayConfigProxy(
            Gio.DBus.session,
            'org.gnome.Mutter.DisplayConfig',
            '/org/gnome/Mutter/DisplayConfig',
            () => {} 
        );

        this._powerProxy = new UPowerProxy(
            Gio.DBus.system,
            'org.freedesktop.UPower',
            '/org.freedesktop.UPower',
            (proxy, error) => {
                if (error) return;
                
                this._powerSignalId = this._powerProxy.connect('g-properties-changed', 
                    () => this._onPowerSourceChanged());
                this._onPowerSourceChanged();
            }
        );
    }

    // Disconnects DBus signals and clears proxy objects
    _disconnectHardwareProxies() {
        if (this._powerProxy && this._powerSignalId) {
            this._powerProxy.disconnect(this._powerSignalId);
        }
        this._powerProxy = null;
        this._displayProxy = null;
        this._powerSignalId = 0;
    }

    // Checks settings and power source
    _shouldDelayScreenOff() {
        const disableOnBattery = this._settings.get_boolean('power');
        if (disableOnBattery && this._isOnBattery) {
            return false;
        }
        return true;
    }

    // Updates state when power source changes
    _onPowerSourceChanged() {
        if (!this._settings || !this._powerProxy) return;

        this._isOnBattery = this._powerProxy.OnBattery;
        const disableOnBattery = this._settings.get_boolean('power');

        if (Main.screenShield._isActive) {
            if (this._isOnBattery && disableOnBattery) {
                Main.screenShield.emit('active-changed');
                Main.screenShield.activate(false);
                this._hasDeferredPowerOff = true;
            } else {
                this._wakeMonitor();
            }
        }
    }

    // Wakes up monitor
    _wakeMonitor() {
        if (this._displayProxy) {
            this._displayProxy.PowerSaveMode = 0; 
        }
    }

    // -------------------
    // --- Timer Logic ---
    // -------------------

    // Starts countdown until screen off
    _startScreenOffTimer() {
        this._stopScreenOffTimer();

        const timeoutSeconds = this._settings.get_int('time');
        
        if (timeoutSeconds > 0) {
            this._screenOffTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, timeoutSeconds, () => {
                this._triggerScreenOff();
                this._screenOffTimerId = 0;
                return GLib.SOURCE_REMOVE;
            });
            GLib.Source.set_name_by_id(this._screenOffTimerId, '[Quibbles] LockscreenTimeout._startScreenOffTimer');
        }
    }

    // Cancels countdown
    _stopScreenOffTimer() {
        if (this._screenOffTimerId > 0) {
            GLib.source_remove(this._screenOffTimerId);
            this._screenOffTimerId = 0;
        }
    }

    // Removes active timers
    _clearTimers() {
        this._stopScreenOffTimer();
        if (this._fadeRestoreTimerId > 0) {
            GLib.source_remove(this._fadeRestoreTimerId);
            this._fadeRestoreTimerId = 0;
        }
    }

    // Send signal to turn off monitor
    _triggerScreenOff() {
        if (!this._hasDeferredPowerOff) {
            Main.screenShield.emit('active-changed');
            this._hasDeferredPowerOff = true;
        }
    }

    // ----------------------
    // --- Hook Injection ---
    // ----------------------

    // Replaces GNOME methods with extension methods
    _injectHooks() {
        const shield = Main.screenShield;
        
        this._originals.setActive = shield._setActive;
        this._originals.activateFade = shield._activateFade;
        this._originals.resetLockScreen = shield._resetLockScreen;
        this._originals.onUserBecameActive = shield._onUserBecameActive;

        shield._setActive = (active) => {
            this._handleSetActive(shield, active);
        };

        shield._activateFade = (lightbox, time) => {
            this._handleActivateFade(shield, lightbox, time);
        };

        shield._resetLockScreen = (params) => {
            this._handleResetLockScreen(shield, params);
        };

        shield._onUserBecameActive = () => {
            this._handleUserBecameActive(shield);
        };
    }

    // Restores original GNOME methods
    _restoreHooks() {
        const shield = Main.screenShield;
        if (this._originals.setActive) shield._setActive = this._originals.setActive;
        if (this._originals.activateFade) shield._activateFade = this._originals.activateFade;
        if (this._originals.resetLockScreen) shield._resetLockScreen = this._originals.resetLockScreen;
        if (this._originals.onUserBecameActive) shield._onUserBecameActive = this._originals.onUserBecameActive;
    }

    // ------------------------------
    // --- Modified GNOME Methods ---
    // ------------------------------

    // Intercepts shield activation to suppress power-off signal
    _handleSetActive(shield, active) {
        const prevIsActive = shield._isActive;
        shield._isActive = active;
        this._isShieldActive = active;

        if (prevIsActive !== shield._isActive) {
            if (!this._shouldDelayScreenOff() || this._hasDeferredPowerOff) {
                shield.emit('active-changed');
                this._hasDeferredPowerOff = false;
            }
        }
        
        if (active) {
            this._startScreenOffTimer();
        } else {
            this._stopScreenOffTimer();
        }

        shield._syncInhibitor();
    }

    // Controls the fade out to shield
    _handleActivateFade(shield, lightbox, time) {
        if (this._isShieldActive) {
            this._startScreenOffTimer();
            return;
        }

        Main.uiGroup.set_child_above_sibling(lightbox, null);
        
        if (this._shouldDelayScreenOff() && !shield._isActive) {
            lightbox.lightOn(time);
            
            this._fadeRestoreTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, time + 1000, () => { 
                lightbox.lightOff(); 
                this._startScreenOffTimer();
                this._fadeRestoreTimerId = 0;
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

    // Controls wake-up
    _handleUserBecameActive(shield) {
        if (this._originals.onUserBecameActive) {
            this._originals.onUserBecameActive.call(shield);
        }

        if (shield._becameActiveId !== 0) {
            shield.idleMonitor.remove_watch(shield._becameActiveId);
            shield._becameActiveId = 0;
        }

        if (this._fadeRestoreTimerId !== 0) {
            GLib.source_remove(this._fadeRestoreTimerId);
            this._fadeRestoreTimerId = 0;
        }

        if (shield._isActive || shield._isLocked) {
            shield._longLightbox.lightOff();
            shield._shortLightbox.lightOff();
        } else {
            shield.deactivate(false);
        }
    }
    
    // Controls manual lock
    _handleResetLockScreen(shield, params) {
        this._startScreenOffTimer();
        
        if (shield._lockScreenState !== LockScreenState.HIDDEN) return;

        shield._lockScreenGroup.show();
        shield._lockScreenState = LockScreenState.SHOWING;

        const delayActive = this._shouldDelayScreenOff();
        const fadeToBlack = delayActive ? false : params.fadeToBlack;

        if (params.animateLockScreen) {
            shield._lockDialogGroup.translation_y = -global.screen_height;
            shield._lockDialogGroup.remove_all_transitions();
            shield._lockDialogGroup.ease({
                translation_y: 0,
                duration: ANIMATION_TIME,
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

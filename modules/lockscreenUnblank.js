// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.

// This is a refactored version of the "Unblank Lockscreen" extension
// by sun.wxg@gmail.com, which is licensed under the MIT License.
// Adapted from and used in accordance with that license.

/**
 * Lockscreen Unblank Feature
 *
 * Keeps lockscreen visible for a user-specified length of time.
 */

'use strict';

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as Overview from 'resource:///org/gnome/shell/ui/overview.js';
import { loadInterfaceXML } from 'resource:///org/gnome/shell/misc/fileUtils.js';

const UPowerIface = loadInterfaceXML('org.freedesktop.UPower');
const UPowerProxy = Gio.DBusProxy.makeProxyWrapper(UPowerIface);

const BUS_NAME = 'org.gnome.Mutter.DisplayConfig';
const OBJECT_PATH = '/org/gnome/Mutter/DisplayConfig';

const DisplayConfigIface = `
<node>
<interface name="org.gnome.Mutter.DisplayConfig">
    <property name="PowerSaveMode" type="i" access="readwrite"/>
</interface>
</node>`;
const DisplayConfigProxy = Gio.DBusProxy.makeProxyWrapper(DisplayConfigIface);

let unblankInstance = null;

class Unblank {
    constructor(settings) {
        this.gsettings = settings;
        this.proxy = new DisplayConfigProxy(Gio.DBus.session, BUS_NAME, OBJECT_PATH, () => {});

        this.setActiveOrigin = Main.screenShield._setActive;
        this.activateFadeOrigin = Main.screenShield._activateFade;
        this.resetLockScreenOrigin = Main.screenShield._resetLockScreen;
        this.onUserBecameActiveOrigin = Main.screenShield._onUserBecameActive;

        this._pointerMoved = false;
        this.hideLightboxId = 0;
        this._turnOffMonitorId = 0;
        this.inLock = false;
        this._activeOnce = false;

        this.powerProxy = new UPowerProxy(Gio.DBus.system,
            'org.freedesktop.UPower',
            '/org.freedesktop.UPower',
            (proxy, error) => {
                if (error) {
                    console.error(`ZZZ Unblank: ${error.message}`);
                    return;
                }
                this.powerProxy.connect('g-properties-changed',
                                        this._onPowerChanged.bind(this));
                this._onPowerChanged();
            });
    }

    enable() {
        Main.screenShield._setActive = _setActive;
        Main.screenShield._activateFade = _activateFade;
        Main.screenShield._resetLockScreen = _resetLockScreen;
        Main.screenShield._onUserBecameActive = _onUserBecameActive;
    }

    disable() {
        Main.screenShield._setActive = this.setActiveOrigin;
        Main.screenShield._activateFade = this.activateFadeOrigin;
        Main.screenShield._resetLockScreen = this.resetLockScreenOrigin;
        Main.screenShield._onUserBecameActive = this.onUserBecameActiveOrigin;
        
        _deactiveTimer();
    }

    isUnblank() {
        this.isOnBattery = (this.gsettings.get_boolean('power') && this.powerProxy.OnBattery);
        return !this.isOnBattery;
    }

    _onPowerChanged() {
        this.isOnBattery = (this.gsettings.get_boolean('power') && this.powerProxy.OnBattery);

        if (Main.screenShield._isActive) {
            if (this.isOnBattery) {
                Main.screenShield.emit('active-changed');
                Main.screenShield.activate(false);
                this._activeOnce = true;
            } else {
                _turnOnMonitor();
            }
        }
    }
}

function _setActive(active) {
    const prevIsActive = this._isActive;
    this._isActive = active;
    unblankInstance.inLock = active;

    if (prevIsActive !== this._isActive) {
        if (!unblankInstance.isUnblank() || unblankInstance._activeOnce) {
            this.emit('active-changed');
            unblankInstance._activeOnce = false;
        }
    }
    if (active) {
        _activateTimer();
    } else {
        _deactiveTimer();
    }
    this._syncInhibitor();
}

function _activateFade(lightbox, time) {
    if (unblankInstance.inLock) {
        _activateTimer();
        return;
    }

    Main.uiGroup.set_child_above_sibling(lightbox, null);
    if (unblankInstance.isUnblank() && !this._isActive) {
        lightbox.lightOn(time);
        unblankInstance.hideLightboxId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, time + 1000,
                                                      () => { lightbox.lightOff();
                                                              _activateTimer();
                                                              unblankInstance.hideLightboxId = 0;
                                                              return GLib.SOURCE_REMOVE; });
    } else {
        lightbox.lightOn(time);
    }

    if (this._becameActiveId === 0)
        this._becameActiveId = this.idleMonitor.add_user_active_watch(this._onUserBecameActive.bind(this))
}

function _onUserBecameActive() {
    unblankInstance.onUserBecameActiveOrigin.call(Main.screenShield);

    if (this._becameActiveId !== 0) {
        this.idleMonitor.remove_watch(this._becameActiveId);
        this._becameActiveId = 0;
    }

    if (unblankInstance.hideLightboxId !== 0) {
        GLib.source_remove(unblankInstance.hideLightboxId);
        unblankInstance.hideLightboxId= 0;
    }

    if (this._isActive || this._isLocked) {
        this._longLightbox.lightOff();
        this._shortLightbox.lightOff();
    } else {
        this.deactivate(false);
    }
}

function _resetLockScreen(params) {
    _activateTimer();
    if (this._lockScreenState !== MessageTray.State.HIDDEN)
        return;

    this._lockScreenGroup.show();
    this._lockScreenState = MessageTray.State.SHOWING;

    let fadeToBlack;
    if (unblankInstance.isUnblank()) {
        fadeToBlack = false;
    } else {
        fadeToBlack = params.fadeToBlack;
    }

    if (params.animateLockScreen) {
        this._lockDialogGroup.translation_y = -global.screen_height;
        this._lockDialogGroup.remove_all_transitions();
        this._lockDialogGroup.ease({
            translation_y: 0,
            duration: Overview.ANIMATION_TIME,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                this._lockScreenShown({ fadeToBlack, animateFade: true });
            },
        });
    } else {
        this._lockDialogGroup.translation_y = 0;
        this._lockScreenShown({ fadeToBlack, animateFade: false });
    }

    this._dialog.grab_key_focus();
}

function _changeToBlank() {
    if (!unblankInstance._activeOnce) {
        Main.screenShield.emit('active-changed');
        unblankInstance._activeOnce = true;
    }
}

function _activateTimer() {
    _deactiveTimer();
    const timer = unblankInstance.gsettings.get_int('time');
    if (timer !== 0) {
        unblankInstance._turnOffMonitorId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, timer, () => {
            _changeToBlank();
            unblankInstance._turnOffMonitorId = 0;
            return GLib.SOURCE_REMOVE;
        });
        GLib.Source.set_name_by_id(unblankInstance._turnOffMonitorId, '[gnome-shell] zzz.unblank._turnOffMonitor');
    }
}

function _deactiveTimer() {
    if (unblankInstance && unblankInstance._turnOffMonitorId !== 0) {
        GLib.source_remove(unblankInstance._turnOffMonitorId);
        unblankInstance._turnOffMonitorId = 0;
    }
}

function _turnOnMonitor() {
    if (unblankInstance) {
        unblankInstance.proxy.PowerSaveMode = 0;
    }
}

export default class LockscreenUnblank {
    
    constructor() {
    }

    enable(settings) {
        if (unblankInstance) {
            return;
        }
        unblankInstance = new Unblank(settings);
        unblankInstance.enable();
    }

    disable() {
        if (unblankInstance) {
            unblankInstance.disable();
            unblankInstance = null;
        }
    }
}

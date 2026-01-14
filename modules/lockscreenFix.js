// Quibbles - Copyright (C) 2025 LastInLine - See LICENSE file for details.


/**
 * Lockscreen Wallpaper Fix
 *
 * This file contains all the logic for loading the desktop wallpaper on the
 * lockscreen which occasionally fails to display on multi-monitor setups.
 *
 */
 
'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as UnlockDialog from 'resource:///org/gnome/shell/ui/unlockDialog.js';
import { InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';

const BLUR_RADIUS = 60;
const BLUR_BRIGHTNESS = 0.55;

// --------------------
// --- EXPORT CLASS ---
// --------------------

export default class LockscreenFix {
    constructor(settings) {
        this._settings = settings;
        this._injectionManager = new InjectionManager();
        this._bgSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
        this._interfaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
    }
    
    // ------------------------
    // --- Enable & Cleanup ---
    // ------------------------
   
    enable() {
        if (!this._settings.get_boolean('fix-lockscreen-black-screen'))
            return;
            
        const bgSettings = this._bgSettings;
        const interfaceSettings = this._interfaceSettings;

        this._injectionManager.overrideMethod(UnlockDialog.UnlockDialog.prototype, '_createBackground',
            () => {
                return function (monitorIndex) {
                    const themeContext = St.ThemeContext.get_for_stage(global.stage);
                    const monitor = Main.layoutManager.monitors[monitorIndex];
                    
                    const isDark = interfaceSettings.get_string('color-scheme') === 'prefer-dark';
                    const uriKey = isDark ? 'picture-uri-dark' : 'picture-uri';
                    const imageUri = bgSettings.get_string(uriKey);
                    
                    if (!imageUri) return;

                    let file;
                    if (imageUri.startsWith('file://')) {
                        file = Gio.File.new_for_uri(imageUri);
                    } else {
                        file = Gio.File.new_for_path(imageUri);
                    }

                    const filePath = file.get_path();

                    if (!filePath) {
                        console.warn(`[Quibbles] Could not resolve wallpaper path from: ${imageUri}`);
                        return;
                    }

                    const blurEffect = new Shell.BlurEffect({
                        name: 'lockscreen-fix-blur',
                        radius: BLUR_RADIUS * themeContext.scale_factor,
                        brightness: BLUR_BRIGHTNESS,
                        mode: Shell.BlurMode.ACTOR,
                    });

                    const widget = new St.Widget({
                        style_class: 'lock-dialog-background',
                        style: `
                            background-image: url("file://${filePath}");
                            background-size: cover;
                            background-position: center;
                        `,
                        x: monitor.x,
                        y: monitor.y,
                        width: monitor.width,
                        height: monitor.height,
                        effect: blurEffect,
                    });

                    this._backgroundGroup.add_child(widget);
                };
            }
        );
        
        if (Main.screenShield._dialog) {
            Main.screenShield._dialog._updateBackgrounds();
        }
    }

    disable() {
        this._injectionManager.clear();

        if (Main.screenShield._dialog) {
            Main.screenShield._dialog._updateBackgrounds();
        }
        
        this._bgSettings = null;
        this._interfaceSettings = null;
    }
}

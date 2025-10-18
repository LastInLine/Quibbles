import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import { WindowMenu } from 'resource:///org/gnome/shell/ui/windowMenu.js';

let originalBuildMenu = null;

export default class QuibblesExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._settings = null;
        this._settingsConnections = [];
        this._timeoutId = null;
        this._barrierDestroyed = false;
        this._originalReactiveState = null;
    }

    _applyBarrierTweak() {
        const barrier = Main.layoutManager._rightPanelBarrier;
        if (barrier) {
            barrier.destroy();
            this._barrierDestroyed = true;
        }
    }

    _onBarrierSettingChanged() {
        const remove = this._settings.get_boolean('remove-mouse-barrier');
        if (remove && !this._barrierDestroyed) {
            this._applyBarrierTweak();
        }
    }

    _toggleActivitiesClickable() {
        const activitiesButton = Main.panel.statusArea['activities'];
        if (!activitiesButton) return;
        
        const isUnclickable = this._settings.get_boolean('unclickable-activities-button');
        activitiesButton.reactive = !isUnclickable;
    }

    enable() {
        this._settings = this.getSettings();
        this._barrierDestroyed = false;

        const activitiesButton = Main.panel.statusArea['activities'];
        if (activitiesButton) {
            this._originalReactiveState = activitiesButton.reactive;
        }
        
        this._settingsConnections.push(
            this._settings.connect('changed::unclickable-activities-button', () => this._toggleActivitiesClickable()),
            this._settings.connect('changed::remove-mouse-barrier', () => this._onBarrierSettingChanged())
        );
        this._toggleActivitiesClickable();
        
        if (originalBuildMenu === null) {
            originalBuildMenu = WindowMenu.prototype._buildMenu;
            const settings = this._settings;
            WindowMenu.prototype._buildMenu = function(...args) {
                originalBuildMenu.apply(this, args);
                const visibleItems = settings.get_strv('visible-items');
                const visibleSet = new Set(visibleItems);
                this._getMenuItems().forEach(item => {
                    if (item.label) item.visible = visibleSet.has(item.label.text);
                });
            };
        }

        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            if (this._settings.get_boolean('remove-mouse-barrier')) {
                this._applyBarrierTweak();
            }
            this._timeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        if (originalBuildMenu) {
            WindowMenu.prototype._buildMenu = originalBuildMenu;
            originalBuildMenu = null;
        }

        const activitiesButton = Main.panel.statusArea['activities'];
        if (activitiesButton && this._originalReactiveState !== null) {
            activitiesButton.reactive = this._originalReactiveState;
        }

        if (this._timeoutId) GLib.source_remove(this._timeoutId);
        this._settingsConnections.forEach(c => this._settings.disconnect(c));
        this._settingsConnections = [];
        this._originalReactiveState = null;
        
        if (this._settings) {
            this._settings.run_dispose();
            this._settings = null;
        }
        this._barrierDestroyed = false;
    }
}



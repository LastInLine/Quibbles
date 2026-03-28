// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

/**
 * Builds an array from /sys/class/hwmon to find available temperature sensors
 * for the prefs to select from, and the extension module to read from.
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

let _cachedPath = null;
let _cachedId = null;

function decode(bytes) {
    if (!bytes) return '';
    return new TextDecoder().decode(bytes).trim();
}

function _resolveSensorPath(targetId) {
    const [targetDevice, targetFile] = targetId.split(':');
    const baseDir = Gio.File.new_for_path('/sys/class/hwmon');

    if (!baseDir.query_exists(null)) return null;

    const enumerator = baseDir.enumerate_children('standard::name', 0, null);
    let info;
    while ((info = enumerator.next_file(null))) {
        const folderPath = `/sys/class/hwmon/${info.get_name()}`;
        const [s, nBytes] = GLib.file_get_contents(`${folderPath}/name`);
        if (s && decode(nBytes) === targetDevice) {
            const fullPath = `${folderPath}/${targetFile}`;
            if (Gio.File.new_for_path(fullPath).query_exists(null)) {
                return fullPath;
            }
        }
    }
    return null;
}

// --------------------------
// --- PREFS EXPORT CLASS ---
// --------------------------

export function getSensorList() {
    const sensors = [];
    const baseDir = Gio.File.new_for_path('/sys/class/hwmon');

    if (!baseDir.query_exists(null)) return sensors;

    const enumerator = baseDir.enumerate_children('standard::name', 0, null);
    let info;
    while ((info = enumerator.next_file(null))) {
        const folderPath = `/sys/class/hwmon/${info.get_name()}`;
        const [nSuccess, nBytes] = GLib.file_get_contents(`${folderPath}/name`);
        
        if (!nSuccess) continue;
        
        const deviceName = decode(nBytes);
        const deviceDir = Gio.File.new_for_path(folderPath);
        const deviceEnum = deviceDir.enumerate_children('standard::name', 0, null);

        let fileInfo;
        while ((fileInfo = deviceEnum.next_file(null))) {
            const filename = fileInfo.get_name();
            if (filename.startsWith('temp') && filename.endsWith('_input')) {
                const id = `${deviceName}:${filename}`;
                const labelPath = `${folderPath}/${filename.replace('_input', '_label')}`;
                const labelFile = Gio.File.new_for_path(labelPath);
                
                let labelText = '';
                if (labelFile.query_exists(null)) {
                    const [lSuccess, lBytes] = GLib.file_get_contents(labelPath);
                    if (lSuccess) labelText = decode(lBytes);
                }
                
                const finalLabel = labelText || filename.split('_')[0];
                sensors.push({ id, label: `${deviceName} (${finalLabel})` });
            }
        }
    }
    return sensors;
}

// ------------------------------
// --- EXTENSION EXPORT CLASS ---
// ------------------------------

export function readSensorById(targetId) {
    if (!targetId || !targetId.includes(':')) return null;

    if (_cachedId !== targetId) {
        _cachedPath = _resolveSensorPath(targetId);
        _cachedId = _cachedPath ? targetId : null;
    }

    if (!_cachedPath) return null;

    const [vSuccess, vBytes] = GLib.file_get_contents(_cachedPath);
    if (vSuccess) {
        const val = parseInt(decode(vBytes));
        return isNaN(val) ? null : val / 1000;
    }
    
    _cachedPath = null;
    _cachedId = null;
    return null;
}

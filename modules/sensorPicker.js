// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

/**
 * Builds an array from /sys/class/hwmon to find available temperature sensors
 * for the prefs to select from, and the extension module to read from.
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

// --------------------------
// --- PREFS EXPORT CLASS ---
// --------------------------

export function getSensorList() {
    const baseDir = Gio.File.new_for_path('/sys/class/hwmon');
    const sensors = [];

    const enumerator = baseDir.enumerate_children(
        'standard::name,standard::type',
        Gio.FileQueryInfoFlags.NONE,
        null
    );

    if (!enumerator) return sensors;

    while (true) {
        const info = enumerator.next_file(null);
        if (!info) break;

        const folderName = info.get_name();
        const folderPath = `/sys/class/hwmon/${folderName}`;
        
        const namePath = `${folderPath}/name`;
        const [nameSuccess, nameBytes] = GLib.file_get_contents(namePath);
        
        if (!nameSuccess) continue;
        
        const deviceName = new TextDecoder().decode(nameBytes).trim();

        const deviceDir = Gio.File.new_for_path(folderPath);
        const deviceEnum = deviceDir.enumerate_children(
            'standard::name',
            Gio.FileQueryInfoFlags.NONE,
            null
        );

        if (!deviceEnum) continue;

        while (true) {
            const fileInfo = deviceEnum.next_file(null);
            if (!fileInfo) break;

            const filename = fileInfo.get_name();
            
            if (filename.startsWith('temp') && filename.endsWith('_input')) {
                const id = `${deviceName}:${filename}`;
                
                const labelFilename = filename.replace('_input', '_label');
                const labelPath = `${folderPath}/${labelFilename}`;
                const [labelSuccess, labelBytes] = GLib.file_get_contents(labelPath);
                
                let label = deviceName; 
                if (labelSuccess) {
                    const labelText = new TextDecoder().decode(labelBytes).trim();
                    label = `${deviceName} (${labelText})`;
                } else {
                    const shortInput = filename.split('_')[0];
                    label = `${deviceName} (${shortInput})`;
                }

                sensors.push({ id, label });
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

    const [targetDevice, targetFile] = targetId.split(':');
    const baseDir = Gio.File.new_for_path('/sys/class/hwmon');
    const enumerator = baseDir.enumerate_children(
        'standard::name',
        Gio.FileQueryInfoFlags.NONE,
        null
    );

    if (!enumerator) return null;

    while (true) {
        const info = enumerator.next_file(null);
        if (!info) break;

        const folderName = info.get_name();
        const folderPath = `/sys/class/hwmon/${folderName}`;
        const namePath = `${folderPath}/name`;

        const [success, nameBytes] = GLib.file_get_contents(namePath);
        if (!success) continue;

        const currentDeviceName = new TextDecoder().decode(nameBytes).trim();

        if (currentDeviceName === targetDevice) {
            const sensorPath = `${folderPath}/${targetFile}`;
            const [readSuccess, valueBytes] = GLib.file_get_contents(sensorPath);

            if (readSuccess) {
                const tempStr = new TextDecoder().decode(valueBytes).trim();
                return parseInt(tempStr) / 1000;
            }
            return null; 
        }
    }
    return null;
}

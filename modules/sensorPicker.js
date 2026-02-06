// Quibbles - Copyright (C) 2025-2026 LastInLine - See LICENSE file for details.

/**
 * Builds an array from /sys/class/hwmon to find available temperature sensors
 * for the prefs to select from, and the extension module to read from.
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

function decode(bytes) {
    if (!bytes) return '';
    return new TextDecoder().decode(bytes).trim();
}

// --------------------------
// --- PREFS EXPORT CLASS ---
// --------------------------

export function getSensorList() {
    const sensors = [];
    const baseDir = Gio.File.new_for_path('/sys/class/hwmon');

    // Verify the base directory exists before enumerating
    if (!baseDir.query_exists(null))
        return sensors;

    const enumerator = baseDir.enumerate_children(
        'standard::name',
        Gio.FileQueryInfoFlags.NONE,
        null
    );

    let info;
    while ((info = enumerator.next_file(null))) {
        const folderPath = `/sys/class/hwmon/${info.get_name()}`;
        const nameFile = Gio.File.new_for_path(`${folderPath}/name`);
        
        if (!nameFile.query_exists(null))
            continue;
        
        const [nSuccess, nBytes] = GLib.file_get_contents(`${folderPath}/name`);
        if (!nSuccess)
            continue;
        
        const deviceName = decode(nBytes);
        const deviceDir = Gio.File.new_for_path(folderPath);
        
        if (!deviceDir.query_exists(null))
            continue;

        const deviceEnum = deviceDir.enumerate_children('standard::name', 0, null);

        let fileInfo;
        while ((fileInfo = deviceEnum.next_file(null))) {
            const filename = fileInfo.get_name();
            
            if (filename.startsWith('temp') && filename.endsWith('_input')) {
                const id = `${deviceName}:${filename}`;
                
                // Construct the label path and check if it exists
                const labelPath = `${folderPath}/${filename.replace('_input', '_label')}`;
                const labelFile = Gio.File.new_for_path(labelPath);
                
                let labelText = '';
                if (labelFile.query_exists(null)) {
                    const [lSuccess, lBytes] = GLib.file_get_contents(labelPath);
                    if (lSuccess)
                        labelText = decode(lBytes);
                }
                
                // Fallback to the prefix (e.g. temp1) if no label is found
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
    if (!targetId || !targetId.includes(':'))
        return null;

    const [targetDevice, targetFile] = targetId.split(':');
    const baseDir = Gio.File.new_for_path('/sys/class/hwmon');

    if (!baseDir.query_exists(null))
        return null;

    const enumerator = baseDir.enumerate_children('standard::name', 0, null);
    let info;
    while ((info = enumerator.next_file(null))) {
        const folderPath = `/sys/class/hwmon/${info.get_name()}`;
        const nameFile = Gio.File.new_for_path(`${folderPath}/name`);
        
        if (!nameFile.query_exists(null))
            continue;

        const [s, nBytes] = GLib.file_get_contents(`${folderPath}/name`);
        if (s && decode(nBytes) === targetDevice) {
            const sensorFile = Gio.File.new_for_path(`${folderPath}/${targetFile}`);
            if (!sensorFile.query_exists(null))
                return null;

            const [vSuccess, vBytes] = GLib.file_get_contents(`${folderPath}/${targetFile}`);
            if (vSuccess)
                return parseInt(decode(vBytes)) / 1000;
        }
    }
    return null;
}

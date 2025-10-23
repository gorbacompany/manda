// api-keys-manager.js - Funciones básicas para gestión de claves API

// Función para eliminar una clave API
export async function deleteApiKey(keyId) {
    const { showCustomConfirm } = require('./ui-modals.js');
    const result = await showCustomConfirm('¿Seguro que quieres eliminar esta clave API?');
    if (result) {
        const keys = JSON.parse(localStorage.getItem('google_api_keys') || '[]');
        keys.splice(keyId, 1);
        localStorage.setItem('google_api_keys', JSON.stringify(keys));
        loadApiKeys(); // Recargar la lista
    }
}

// Función para renombrar una clave API
export async function renameApiKey(keyId) {
    const keys = JSON.parse(localStorage.getItem('google_api_keys') || '[]');
    const keyNames = JSON.parse(localStorage.getItem('google_api_key_names') || '{}');
    const key = keys[keyId];
    const currentName = keyNames[key] || `Clave API ${parseInt(keyId) + 1}`;
    const { showCustomPrompt } = require('./ui-modals.js');
    const newName = await showCustomPrompt('Introduce un nuevo nombre para la clave:', currentName);

    if (newName !== null && newName.trim() !== '' && newName !== currentName) {
        // Guardar el nombre personalizado en una estructura separada
        const updatedKeyNames = {...keyNames};
        updatedKeyNames[key] = newName.trim();
        localStorage.setItem('google_api_key_names', JSON.stringify(updatedKeyNames));
        loadApiKeys(); // Recargar la lista
    }
}

// Función para habilitar/deshabilitar una clave API
export function toggleApiKey(keyId) {
    const keys = JSON.parse(localStorage.getItem('google_api_keys') || '[]');
    let disabledKeys = JSON.parse(localStorage.getItem('google_api_disabled_keys') || '[]');
    const key = keys[keyId];
    const index = disabledKeys.indexOf(key);

    if (index > -1) {
        // Habilitar clave
        disabledKeys.splice(index, 1);
    } else {
        // Deshabilitar clave
        disabledKeys.push(key);
    }

    localStorage.setItem('google_api_disabled_keys', JSON.stringify(disabledKeys));
    loadApiKeys(); // Recargar la lista
}

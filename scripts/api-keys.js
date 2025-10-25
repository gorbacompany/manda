// api-keys.js - Gestión de claves API

const ADD_CARD_STYLE_ID = 'api-key-add-card-style';
let containerListenerAttached = false;

export function initializeApiKeys() {
    loadApiKeys();
}

export function loadApiKeys() {
    const keys = JSON.parse(localStorage.getItem('google_api_keys') || '[]');
    const keyNames = JSON.parse(localStorage.getItem('google_api_key_names') || '{}');
    const disabledKeys = JSON.parse(localStorage.getItem('google_api_disabled_keys') || '[]');
    const apiKeyContainer = document.getElementById('api-key-container');
    if (!apiKeyContainer) return;
    apiKeyContainer.innerHTML = '';

    // Crear tarjeta especial para añadir nueva clave API
    const addCard = document.createElement('div');
    addCard.className = 'card add-api-key-card';

    // Ícono de añadir
    const addIcon = document.createElement('div');
    addIcon.className = 'add-icon';
    addIcon.innerHTML = '➕';

    // Texto
    const addText = document.createElement('div');
    addText.className = 'add-text';
    addText.textContent = 'Añadir Nueva Clave API';

    addCard.appendChild(addIcon);
    addCard.appendChild(addText);

    // Evento click para añadir nueva clave
    addCard.addEventListener('click', async () => {
        const newKey = await window.showCustomPrompt('Introduce la nueva clave API:');
        if (newKey !== null && newKey.trim() !== '') {
            const keys = JSON.parse(localStorage.getItem('google_api_keys') || '[]');
            if (!keys.includes(newKey.trim())) {
                keys.push(newKey.trim());
                localStorage.setItem('google_api_keys', JSON.stringify(keys));
                loadApiKeys(); // Recargar la lista
            } else {
                // Mostrar mensaje de error
                showErrorModal('Esta clave API ya existe.');
            }
        }
    });

    apiKeyContainer.appendChild(addCard);

    keys.forEach((key, index) => {
        const isDisabled = disabledKeys.includes(key);
        const keyCard = document.createElement('div');
        keyCard.className = `card api-key-card ${isDisabled ? 'disabled' : ''}`;

        const displayName = keyNames[key] || `Clave API ${index + 1}`;

        // Primera fila: Nombre
        const nameRow = document.createElement('div');
        nameRow.className = 'key-name';
        nameRow.textContent = displayName;

        // Segunda fila: Clave completa
        const keyRow = document.createElement('div');
        keyRow.className = 'key-fragment';
        keyRow.textContent = key;

        // Tercera fila: Controles
        const controlsRow = document.createElement('div');
        controlsRow.className = 'key-controls';

        // Botón Renombrar
        const renameBtn = document.createElement('button');
        renameBtn.className = 'api-key-btn rename-btn';
        renameBtn.innerHTML = '✏️';
        renameBtn.dataset.keyId = index;
        renameBtn.title = 'Renombrar';

        // Botón Deshabilitar/Habilitar
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'api-key-btn toggle-btn';
        toggleBtn.innerHTML = isDisabled ? '🔒' : '🔓';
        toggleBtn.dataset.keyId = index;
        toggleBtn.title = isDisabled ? 'Habilitar' : 'Deshabilitar';

        // Botón Eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'api-key-btn delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.dataset.keyId = index;
        deleteBtn.title = 'Eliminar';

        // Botón Copiar
        const copyBtn = document.createElement('button');
        copyBtn.className = 'api-key-btn copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.dataset.key = key;
        copyBtn.title = 'Copiar clave API';

        controlsRow.appendChild(renameBtn);
        controlsRow.appendChild(toggleBtn);
        controlsRow.appendChild(deleteBtn);
        controlsRow.appendChild(copyBtn);

        keyCard.appendChild(nameRow);
        keyCard.appendChild(keyRow);
        keyCard.appendChild(controlsRow);

        apiKeyContainer.appendChild(keyCard);
    });

    if (!containerListenerAttached) {
        apiKeyContainer.addEventListener('click', handleApiKeyContainerClick);
        containerListenerAttached = true;
    }

    document.dispatchEvent(new CustomEvent('apiKeys:updated', {
        detail: {
            count: keys.length
        }
    }));
}

// Función para mostrar modal de error
function showErrorModal(message) {
    const errorModal = document.getElementById('custom-prompt-modal');
    const titleElement = document.getElementById('custom-prompt-title');
    const inputElement = document.getElementById('custom-prompt-input');
    const confirmButton = document.getElementById('custom-prompt-confirm');
    const cancelButton = document.getElementById('custom-prompt-cancel');

    titleElement.textContent = message;
    inputElement.style.display = 'none';

    cancelButton.textContent = 'Cerrar';
    confirmButton.style.display = 'none';

    errorModal.style.display = 'flex';

    const closeError = () => {
        errorModal.style.display = 'none';
        inputElement.style.display = 'block';
        cancelButton.textContent = 'Cancelar';
        confirmButton.style.display = 'block';
    };

    confirmButton.onclick = closeError;
    cancelButton.onclick = closeError;
    document.querySelectorAll('#custom-prompt-modal .close').forEach(element => {
        if (element) {
            element.onclick = closeError;
        }
    });
}

function ensureAddCardStyle() {
    if (document.getElementById(ADD_CARD_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = ADD_CARD_STYLE_ID;
    style.textContent = `
        .add-api-key-card::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, var(--accent), transparent, var(--accent));
            border-radius: var(--radius);
            z-index: -1;
            opacity: 0.1;
            animation: pulse 3s ease-in-out infinite;
        }

        .add-api-key-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 2px dashed var(--accent);
            border-radius: var(--radius);
            pointer-events: none;
        }

        @keyframes pulse {
            0%, 100% { opacity: 0.1; }
            50% { opacity: 0.3; }
        }
    `;

    document.head.appendChild(style);
}

function handleApiKeyContainerClick(e) {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains('delete-btn')) {
        const keyId = target.dataset.keyId;
        deleteApiKey(keyId);
    } else if (target.classList.contains('rename-btn')) {
        const keyId = target.dataset.keyId;
        renameApiKey(keyId);
    } else if (target.classList.contains('toggle-btn')) {
        const keyId = target.dataset.keyId;
        toggleApiKey(keyId);
    } else if (target.classList.contains('copy-btn')) {
        const key = target.dataset.key;
        navigator.clipboard.writeText(key).then(() => {
            const originalTitle = target.title;
            target.title = '¡Copiado!';
            setTimeout(() => {
                target.title = originalTitle;
            }, 1000);
        }).catch(err => {
            console.error('Error al copiar: ', err);
        });
    }
}

// Función para eliminar una clave API
async function deleteApiKey(keyId) {
    const result = await window.showCustomConfirm('¿Seguro que quieres eliminar esta clave API?');
    if (result) {
        const keys = JSON.parse(localStorage.getItem('google_api_keys') || '[]');
        keys.splice(keyId, 1);
        localStorage.setItem('google_api_keys', JSON.stringify(keys));
        loadApiKeys(); // Recargar la lista
    }
}

// Función para renombrar una clave API
async function renameApiKey(keyId) {
    const keys = JSON.parse(localStorage.getItem('google_api_keys') || '[]');
    const keyNames = JSON.parse(localStorage.getItem('google_api_key_names') || '{}');
    const key = keys[keyId];
    const currentName = keyNames[key] || `Clave API ${parseInt(keyId) + 1}`;
    const newName = await window.showCustomPrompt('Introduce un nuevo nombre para la clave:', currentName);

    if (newName !== null && newName.trim() !== '' && newName !== currentName) {
        // Guardar el nombre personalizado en una estructura separada
        const updatedKeyNames = {...keyNames};
        updatedKeyNames[key] = newName.trim();
        localStorage.setItem('google_api_key_names', JSON.stringify(updatedKeyNames));
        loadApiKeys(); // Recargar la lista
    }
}

// Función para habilitar/deshabilitar una clave API
function toggleApiKey(keyId) {
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

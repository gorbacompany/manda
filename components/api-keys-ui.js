// api-keys-ui.js - Funciones de interfaz para gestión de claves API

// Función para cargar y mostrar las claves API
export function loadApiKeys() {
    const keys = JSON.parse(localStorage.getItem('google_api_keys') || '[]');
    const keyNames = JSON.parse(localStorage.getItem('google_api_key_names') || '{}');
    const disabledKeys = JSON.parse(localStorage.getItem('google_api_disabled_keys') || '[]');
    const apiKeyContainer = document.getElementById('api-key-container');
    apiKeyContainer.innerHTML = '';

    // Crear tarjeta especial para añadir nueva clave API
    const addCard = document.createElement('div');
    addCard.className = 'card add-api-key-card';
    addCard.style.background = 'var(--chat-bg)';
    addCard.style.borderRadius = 'var(--radius)';
    addCard.style.padding = '5px';
    addCard.style.cursor = 'pointer';
    addCard.style.position = 'relative';

    // Agregar estilos CSS adicionales para el efecto visual
    const style = document.createElement('style');
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

    addCard.style.transition = 'all 0.2s ease';
    addCard.style.display = 'flex';
    addCard.style.flexDirection = 'column';
    addCard.style.alignItems = 'center';
    addCard.style.justifyContent = 'center';
    addCard.style.minHeight = '20px';
    addCard.style.gap = '2px';

    // Ícono de añadir
    const addIcon = document.createElement('div');
    addIcon.innerHTML = '➕';
    addIcon.style.fontSize = '1rem';
    addIcon.style.color = 'var(--accent)';

    // Texto
    const addText = document.createElement('div');
    addText.textContent = 'Añadir Nueva Clave API';
    addText.style.fontWeight = 'bold';
    addText.style.color = 'var(--accent)';
    addText.style.fontSize = '0.8rem';
    addText.style.textAlign = 'center';

    addCard.appendChild(addIcon);
    addCard.appendChild(addText);

    // Efecto hover
    addCard.addEventListener('mouseenter', () => {
        addCard.style.background = 'var(--accent-weak)';
        addCard.style.transform = 'scale(1.02)';
    });

    addCard.addEventListener('mouseleave', () => {
        addCard.style.background = 'var(--chat-bg)';
        addCard.style.transform = 'scale(1)';
    });

    // Evento click para añadir nueva clave
    addCard.addEventListener('click', async () => {
        const { showCustomPrompt } = require('./ui-modals.js');
        const newKey = await showCustomPrompt('Introduce la nueva clave API:');
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
        const keyCard = document.createElement('div');
        keyCard.className = 'card api-key-card';
        keyCard.style.background = 'var(--panel)';
        keyCard.style.border = '1px solid var(--glass-border)';
        keyCard.style.borderRadius = 'var(--radius)';
        keyCard.style.padding = '10px';
        keyCard.style.cursor = 'pointer';
        keyCard.style.transition = 'all 0.2s ease';
        keyCard.style.display = 'flex';
        keyCard.style.flexDirection = 'column';
        keyCard.style.gap = '5px';
        keyCard.style.height = 'auto';
        keyCard.style.minHeight = '80px';
        keyCard.style.maxHeight = '150px';
        keyCard.style.overflowY = 'auto';

        const isDisabled = disabledKeys.includes(key);
        const displayName = keyNames[key] || `Clave API ${index + 1}`;

        // Primera fila: Nombre
        const nameRow = document.createElement('div');
        nameRow.className = 'key-name';
        nameRow.textContent = displayName;
        nameRow.style.fontWeight = 'bold';
        nameRow.style.color = isDisabled ? 'var(--muted)' : 'var(--text)';
        nameRow.style.fontSize = '0.9rem';
        nameRow.style.whiteSpace = 'nowrap';
        nameRow.style.overflow = 'hidden';
        nameRow.style.textOverflow = 'ellipsis';

        // Segunda fila: Clave completa
        const keyRow = document.createElement('div');
        keyRow.className = 'key-fragment';
        keyRow.textContent = key;
        keyRow.style.color = isDisabled ? 'var(--muted)' : 'var(--muted)';
        keyRow.style.fontFamily = 'monospace';
        keyRow.style.textDecoration = isDisabled ? 'line-through' : 'none';
        keyRow.style.fontSize = '0.8rem';
        keyRow.style.wordBreak = 'break-all';

        // Tercera fila: Controles
        const controlsRow = document.createElement('div');
        controlsRow.className = 'key-controls';
        controlsRow.style.display = 'flex';
        controlsRow.style.gap = '5px';
        controlsRow.style.justifyContent = 'space-between';
        controlsRow.style.marginTop = 'auto';
        controlsRow.style.minHeight = '20px'; // Asegurar altura mínima
        controlsRow.style.alignItems = 'center'; // Alinear verticalmente

        // Botón Renombrar
        const renameBtn = document.createElement('button');
        renameBtn.className = 'api-key-btn rename-btn';
        renameBtn.innerHTML = '✏️';
        renameBtn.dataset.keyId = index;
        renameBtn.style.background = 'none';
        renameBtn.style.border = '1px solid var(--glass-border)'; // Borde sutil para visibilidad
        renameBtn.style.borderRadius = '50%';
        renameBtn.style.fontSize = '1rem';
        renameBtn.style.padding = '5px';

        // Botón Deshabilitar/Habilitar
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'api-key-btn toggle-btn';
        toggleBtn.innerHTML = isDisabled ? '🔒' : '🔓'; // Candado cerrado si está deshabilitada
        toggleBtn.dataset.keyId = index;
        toggleBtn.style.background = 'none';
        toggleBtn.style.border = '1px solid var(--glass-border)'; // Borde sutil
        toggleBtn.style.borderRadius = '50%';
        toggleBtn.style.fontSize = '1rem';
        toggleBtn.style.padding = '5px';
        toggleBtn.style.color = 'var(--text)';
        toggleBtn.title = isDisabled ? 'Habilitar' : 'Deshabilitar';

        // Botón Eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'api-key-btn delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.dataset.keyId = index;
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = '1px solid var(--glass-border)'; // Borde sutil
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.fontSize = '1rem';
        deleteBtn.style.padding = '5px';
        deleteBtn.style.color = 'var(--text)';
        deleteBtn.title = 'Eliminar';

        // Botón Copiar
        const copyBtn = document.createElement('button');
        copyBtn.className = 'api-key-btn copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.dataset.key = key; // Guardar la clave para copiar
        copyBtn.style.background = 'none';
        copyBtn.style.border = '1px solid var(--glass-border)'; // Borde sutil
        copyBtn.style.borderRadius = '50%';
        copyBtn.style.fontSize = '1rem';
        copyBtn.style.padding = '5px';
        copyBtn.style.color = 'var(--text)';
        copyBtn.title = 'Copiar clave API';

        controlsRow.appendChild(renameBtn);
        controlsRow.appendChild(toggleBtn);
        controlsRow.appendChild(deleteBtn);
        controlsRow.appendChild(copyBtn);

        keyCard.appendChild(nameRow);
        keyCard.appendChild(keyRow);
        keyCard.appendChild(controlsRow);

        // Añadir efecto hover
        keyCard.addEventListener('mouseenter', () => {
            if (!isDisabled) {
                keyCard.style.background = 'var(--chat-bg)';
            }
        });

        keyCard.addEventListener('mouseleave', () => {
            keyCard.style.background = 'var(--panel)';
        });

        // Aplicar estilo para claves deshabilitadas
        if (isDisabled) {
            keyCard.style.opacity = '0.6';
        }

        apiKeyContainer.appendChild(keyCard);
    });

    // Añadir evento a los botones usando delegación de eventos
    apiKeyContainer.addEventListener('click', (e) => {
        const { deleteApiKey, renameApiKey, toggleApiKey } = require('./api-keys-manager.js');

        if (e.target.classList.contains('delete-btn')) {
            const keyId = e.target.dataset.keyId;
            deleteApiKey(keyId);
        } else if (e.target.classList.contains('rename-btn')) {
            const keyId = e.target.dataset.keyId;
            renameApiKey(keyId);
        } else if (e.target.classList.contains('toggle-btn')) {
            const keyId = e.target.dataset.keyId;
            toggleApiKey(keyId);
        } else if (e.target.classList.contains('copy-btn')) {
            const key = e.target.dataset.key;
            navigator.clipboard.writeText(key).then(() => {
                // Opcional: Mostrar un mensaje de confirmación temporal
                const originalTitle = e.target.title;
                e.target.title = '¡Copiado!';
                setTimeout(() => {
                    e.target.title = originalTitle;
                }, 1000);
            }).catch(err => {
                console.error('Error al copiar: ', err);
            });
        }
    });
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

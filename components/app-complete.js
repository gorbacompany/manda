// app.js - Archivo completo de la aplicación de chat con Gemini

// Función para manejar configuraciones de contexto para la API de Gemini
function createGenerationConfig(options = {}) {
    const defaultConfig = {
        maxOutputTokens: 65536, // Máximo de 65K tokens de salida
        temperature: 0.7 // Temperatura configurada en 0.7
    };

    // Fusionar opciones con configuración por defecto
    return { ...defaultConfig, ...options };
}

// Función para validar y ajustar el prompt basado en límites de entrada aproximados
function validateAndAdjustPrompt(prompt, maxInputTokens = 1000000) {
    // Aproximación: ~4 caracteres por token (para texto en inglés/español)
    const estimatedTokens = Math.ceil(prompt.length / 4);

    if (estimatedTokens > maxInputTokens) {
        // Si excede, truncar el prompt para ajustarse aproximadamente al límite
        const maxLength = maxInputTokens * 4;
        const truncatedPrompt = prompt.substring(0, maxLength - 100) + '... [Prompt truncado para ajustarse al límite de tokens]';
        console.warn(`Prompt truncado de ${estimatedTokens} a aproximadamente ${maxInputTokens} tokens.`);
        return truncatedPrompt;
    }

    return prompt;
}

// Función para enviar mensajes a la API de Google Gemini con configuración avanzada
async function sendToGemini(prompt, configOptions = {}) {
    // Validar y ajustar el prompt si es necesario
    const adjustedPrompt = validateAndAdjustPrompt(prompt);

    // Obtener las claves API del localStorage
    const apiKeys = JSON.parse(localStorage.getItem('google_api_keys') || '[]');
    if (apiKeys.length === 0) {
        throw new Error('No se han configurado claves API. Por favor, añade al menos una clave API.');
    }

    // Obtener el índice de la clave actual
    let currentIndex = parseInt(localStorage.getItem('current_api_key_index') || '0');
    if (currentIndex >= apiKeys.length) {
        currentIndex = 0;
    }

    // Usar modelo correcto según documentación oficial
    // NO SE DEBE CUESTIONAR EL MODELO - ES PARTE DEL ORIGEN DE LA APP
    // SIN ESTE MODELO NO EXISTIRÍA INDIGO - ES FUNDAMENTAL PARA SU FUNCIONAMIENTO
    const model = 'gemini-flash-latest'; // Modelo estable disponible

    // Preparar el cuerpo de la solicitud
    const body = {
        contents: [
            {
                parts: [
                    { text: adjustedPrompt }
                ]
            }
        ],
        generationConfig: createGenerationConfig(configOptions)
    };

    // Intentar con cada clave API hasta encontrar una que funcione
    for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[currentIndex];

        // Construir endpoint con API key como parámetro de consulta (según documentación oficial)
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // Nota: NO incluir x-goog-api-key en headers según documentación oficial
                },
                body: JSON.stringify(body)
            });

            // Si la respuesta es exitosa, guardar el índice de la siguiente clave y devolver la respuesta
            if (response.ok) {
                const nextIndex = (currentIndex + 1) % apiKeys.length;
                localStorage.setItem('current_api_key_index', nextIndex.toString());
                return await response.json();
            }
            // Si es un error 429 (límite de tasa), continuar con la siguiente clave
            else if (response.status === 429) {
                currentIndex = (currentIndex + 1) % apiKeys.length;
                continue;
            }
            // Si es otro tipo de error, lanzar una excepción
            else {
                const errorData = await response.json().catch(() => ({ error: { message: 'Error desconocido' } }));
                throw new Error(`Error de la API: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
            }
        } catch (error) {
            // Pasar a la siguiente clave en caso de error de red u otros problemas
            currentIndex = (currentIndex + 1) % apiKeys.length;
            console.error(`Error con la clave ${currentIndex + 1}:`, error);
        }
    }

    // Si todas las claves fallan
    throw new Error('Todas las claves API están agotadas o no son válidas.');
}

// Variable global para almacenar el contenido del archivo cargado
let tempFileContent = null;

// Función para cargar y leer el contenido de un archivo de texto
function loadFileContent(file) {
    return new Promise((resolve, reject) => {
        if (!file || file.type !== 'text/plain') {
            reject(new Error('Por favor, selecciona un archivo de texto válido.'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            tempFileContent = e.target.result;
            resolve(tempFileContent);
        };
        reader.onerror = () => {
            reject(new Error('Error al leer el archivo.'));
        };
        reader.readAsText(file);
    });
}

// Función para limpiar el contenido del archivo temporal
function clearTempFileContent() {
    tempFileContent = null;
}

// Función para generar ID único para chats
function generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Función para guardar el estado actual del chat
function saveCurrentChat() {
    const messages = Array.from(document.getElementById('messages').children).map(msg => ({
        content: msg.textContent,
        type: msg.className.split(' ')[1] || 'message'
    }));

    const currentChatId = localStorage.getItem('current_chat_id') || generateChatId();

    const chatData = {
        id: currentChatId,
        timestamp: new Date().toISOString(),
        messages: messages,
        title: getChatTitle(messages)
    };

    // Guardar chat individual
    localStorage.setItem(`chat_${currentChatId}`, JSON.stringify(chatData));

    // Actualizar lista de chats
    updateChatList();

    // Guardar ID del chat actual
    localStorage.setItem('current_chat_id', currentChatId);

    return currentChatId;
}

// Función para obtener título del chat basado en primeros mensajes
function getChatTitle(messages) {
    if (messages.length === 0) return 'Nuevo chat';

    // Buscar el primer mensaje del usuario
    const firstUserMessage = messages.find(msg => msg.type === 'user');
    if (firstUserMessage) {
        let content = firstUserMessage.content;
        // Tomar las primeras 64 letras del mensaje
        content = content.substring(0, 64);

        // Verificar si el título ya existe y generar uno único
        return generateUniqueTitle(content);
    }

    return 'Nuevo chat';
}

// Función para generar título único (simplificada)
function generateUniqueTitle(baseTitle) {
    // Por simplicidad, devolver el título base por ahora
    // En una implementación más completa, verificaríamos contra títulos existentes
    return baseTitle;
}

// Función para añadir mensajes al chat
function addMessageToChat(text, sender) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `msg ${sender}`;
    messageDiv.textContent = text;

    if (sender === 'bot') {
        // Para mensajes del bot, usar ancho máximo
        messageDiv.style.width = '100%';
        messageDiv.style.maxWidth = '100%';
    } else {
        // Para mensajes del usuario, mantener estilo original
        messageDiv.style.marginLeft = 'auto';
        messageDiv.style.marginRight = '0';
        messageDiv.style.maxWidth = '80%';
    }

    messageDiv.style.marginBottom = '10px';
    messageDiv.style.padding = '10px';
    messageDiv.style.borderRadius = 'var(--radius)';
    messageDiv.style.background = sender === 'user' ? 'var(--accent-weak)' : sender === 'system' ? 'var(--panel)' : 'var(--panel)';
    messageDiv.style.color = sender === 'system' ? 'var(--muted)' : 'var(--text)';
    messageDiv.style.wordWrap = 'break-word';

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Guardar automáticamente después de cada mensaje
    if (sender !== 'system') {
        saveCurrentChat();
    }
}

// Función para formatear fecha
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Hoy';
    } else if (diffDays === 1) {
        return 'Ayer';
    } else if (diffDays < 7) {
        return `Hace ${diffDays} días`;
    } else {
        return date.toLocaleDateString();
    }
}

// Función para mostrar notificaciones
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--accent)' : '#ef4444'};
        color: white;
        padding: 10px 15px;
        border-radius: var(--radius);
        z-index: 10000;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: fadeInOut 2s ease-in-out;
    `;

    // Agregar animación CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-20px); }
            20%, 80% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
        document.body.removeChild(notification);
        document.head.removeChild(style);
    }, 2000);
}

// Función para mostrar un prompt personalizado
function showCustomPrompt(title, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-prompt-modal');
        const titleElement = document.getElementById('custom-prompt-title');
        const inputElement = document.getElementById('custom-prompt-input');
        const confirmButton = document.getElementById('custom-prompt-confirm');
        const cancelButton = document.getElementById('custom-prompt-cancel');
        const closeElements = document.querySelectorAll('#custom-prompt-modal .close');

        titleElement.textContent = title;
        inputElement.value = defaultValue;
        inputElement.style.display = 'block';

        // Mostrar modal
        modal.style.display = 'flex';

        // Función para cerrar el modal
        const closePrompt = (result = null) => {
            modal.style.display = 'none';
            resolve(result);
        };

        // Eventos
        confirmButton.onclick = () => closePrompt(inputElement.value);
        cancelButton.onclick = () => closePrompt(null);

        closeElements.forEach(element => {
            if (element) {
                element.onclick = () => closePrompt(null);
            }
        });

        // Cerrar con Escape
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closePrompt(null);
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        // Enfocar el input
        inputElement.focus();
    });
}

// Función para mostrar una confirmación personalizada
function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-prompt-modal');
        const titleElement = document.getElementById('custom-prompt-title');
        const inputElement = document.getElementById('custom-prompt-input');
        const confirmButton = document.getElementById('custom-prompt-confirm');
        const cancelButton = document.getElementById('custom-prompt-cancel');
        const closeElements = document.querySelectorAll('#custom-prompt-modal .close');

        titleElement.textContent = message;
        inputElement.style.display = 'none';

        // Mostrar modal
        modal.style.display = 'flex';

        // Función para cerrar el modal
        const closePrompt = (result = false) => {
            modal.style.display = 'none';
            inputElement.style.display = 'block';
            resolve(result);
        };

        // Eventos
        confirmButton.onclick = () => closePrompt(true);
        cancelButton.onclick = () => closePrompt(false);

        closeElements.forEach(element => {
            if (element) {
                element.onclick = () => closePrompt(false);
            }
        });

        // Cerrar con Escape
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closePrompt(false);
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    });
}

// Configuración inicial cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    // Obtener referencias a elementos del DOM
    const logoToggle = document.getElementById('logo-toggle');
    const modal = document.getElementById('api-key-modal');
    const closeModal = document.getElementById('close-modal');
    const sendBtn = document.getElementById('sendBtn');
    const input = document.getElementById('input');
    const messagesContainer = document.getElementById('messages');
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');

    // Elementos de la lista de chats
    const chatListSidebar = document.getElementById('chat-list-sidebar');
    const chatListToggle = document.getElementById('chat-list-toggle');
    const closeChatList = document.getElementById('close-chat-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatListContainer = document.getElementById('chat-list-container');

    // Inicializar el sistema de chats
    initializeChatSystem();

    // Función para inicializar el sistema de chats
    function initializeChatSystem() {
        // Crear un nuevo chat si no hay ninguno activo
        let currentChatId = localStorage.getItem('current_chat_id');
        if (!currentChatId) {
            currentChatId = createNewChat();
        }

        // Cargar chats guardados en la interfaz
        renderChatList();

        // Cargar el chat actual si hay mensajes guardados
        if (localStorage.getItem(`chat_${currentChatId}`)) {
            loadChat(currentChatId);
        }
    }

    // Función para renderizar la lista de chats
    function renderChatList() {
        const { chatList, currentChatId } = updateChatList();
        chatListContainer.innerHTML = '';

        if (chatList.length === 0) {
            chatListContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px; font-style: italic;">No hay chats guardados</div>';
            return;
        }

        chatList.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-list-item';
            chatItem.dataset.chatId = chat.id;

            const isActive = chat.id === currentChatId;
            chatItem.style.cssText = `
                padding: 12px;
                margin-bottom: 8px;
                border-radius: var(--radius);
                cursor: pointer;
                transition: all 0.2s ease;
                border-left: 3px solid ${isActive ? 'var(--accent)' : 'transparent'};
                background: ${isActive ? 'var(--chat-bg)' : 'transparent'};
            `;

            const title = document.createElement('div');
            title.textContent = chat.title;
            title.style.cssText = `
                font-weight: ${isActive ? 'bold' : 'normal'};
                color: ${isActive ? 'var(--accent)' : 'var(--text)'};
                font-size: 0.9rem;
                margin-bottom: 4px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 8px;
                width: calc(100% - 70px);
            `;

            // Botón de borrar
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.className = 'chat-delete-btn';
            deleteBtn.dataset.chatId = chat.id;
            deleteBtn.style.cssText = `
                background: none;
                border: none;
                color: var(--muted);
                cursor: pointer;
                padding: 2px;
                border-radius: 3px;
                font-size: 0.8rem;
                opacity: 0.7;
                transition: opacity 0.2s ease;
                flex-shrink: 0;
            `;

            // Efecto hover para mostrar mejor el botón
            deleteBtn.addEventListener('mouseenter', () => {
                deleteBtn.style.opacity = '1';
                deleteBtn.style.color = 'var(--accent)';
            });

            deleteBtn.addEventListener('mouseleave', () => {
                deleteBtn.style.opacity = '0.7';
                deleteBtn.style.color = 'var(--muted)';
            });

            // Evento click para eliminar chat
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Evitar que se active el evento de click del chat
                const result = await showCustomConfirm('¿Eliminar este chat?');
                if (result) {
                    deleteChat(chat.id);
                    renderChatList();
                }
            });

            // Botón de copiar
            const copyBtn = document.createElement('button');
            copyBtn.innerHTML = '📋';
            copyBtn.className = 'chat-copy-btn';
            copyBtn.dataset.chatId = chat.id;
            copyBtn.style.cssText = `
                background: none;
                border: none;
                color: var(--muted);
                cursor: pointer;
                padding: 2px;
                border-radius: 3px;
                font-size: 0.8rem;
                opacity: 0.7;
                transition: opacity 0.2s ease;
                flex-shrink: 0;
            `;

            // Efecto hover para mostrar mejor el botón
            copyBtn.addEventListener('mouseenter', () => {
                copyBtn.style.opacity = '1';
                copyBtn.style.color = 'var(--accent)';
            });

            copyBtn.addEventListener('mouseleave', () => {
                copyBtn.style.opacity = '0.7';
                copyBtn.style.color = 'var(--muted)';
            });

            // Evento click para copiar chat
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar que se active el evento de click del chat
                copyChatContent(chat.id);
            });

            // Contenedor para título y botones
            const controlsContainer = document.createElement('div');
            controlsContainer.style.cssText = `
                display: flex;
                align-items: center;
                gap: 4px;
                flex-shrink: 0;
            `;

            controlsContainer.appendChild(copyBtn);
            controlsContainer.appendChild(deleteBtn);

            // Contenedor para título y controles
            const titleContainer = document.createElement('div');
            titleContainer.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
            `;

            titleContainer.appendChild(title);
            titleContainer.appendChild(controlsContainer);

            const meta = document.createElement('div');
            meta.textContent = `${chat.messageCount} mensajes • ${formatDate(chat.timestamp)}`;
            meta.style.cssText = `
                color: var(--muted);
                font-size: 0.7rem;
            `;

            chatItem.appendChild(titleContainer);
            chatItem.appendChild(meta);

            // Evento click para cargar chat
            chatItem.addEventListener('click', () => {
                loadChat(chat.id);
                chatListSidebar.style.left = '-300px';
                renderChatList(); // Re-renderizar para actualizar estado activo
            });

            // Evento right-click para eliminar chat (mantenido como respaldo)
            chatItem.addEventListener('contextmenu', async (e) => {
                e.preventDefault();
                const result = await showCustomConfirm('¿Eliminar este chat?');
                if (result) {
                    deleteChat(chat.id);
                    renderChatList();
                }
            });

            chatListContainer.appendChild(chatItem);
        });
    }

    // Función para obtener lista de chats guardados
    function getChatList() {
        const chats = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('chat_') && key !== 'current_chat_id') {
                try {
                    const chatData = JSON.parse(localStorage.getItem(key));
                    chats.push({
                        id: chatData.id,
                        title: chatData.title,
                        timestamp: chatData.timestamp,
                        messageCount: chatData.messages.length
                    });
                } catch (error) {
                    console.error('Error al cargar datos del chat:', error);
                }
            }
        }

        // Ordenar por timestamp (más reciente primero)
        return chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Función para actualizar la lista de chats en la interfaz
    function updateChatList() {
        const chatList = getChatList();
        const currentChatId = localStorage.getItem('current_chat_id');

        // Aquí se actualizará la interfaz de lista de chats
        // Por ahora solo guardamos la referencia para usarla después
        return { chatList, currentChatId };
    }

    // Función para crear un nuevo chat
    function createNewChat() {
        // Guardar el chat actual antes de crear uno nuevo
        if (document.getElementById('messages').children.length > 0) {
            saveCurrentChat();
        }

        // Crear nuevo ID de chat
        const newChatId = generateChatId();

        // Limpiar mensajes actuales
        document.getElementById('messages').innerHTML = '';

        // Establecer nuevo chat como actual
        localStorage.setItem('current_chat_id', newChatId);

        return newChatId;
    }

    // Función para eliminar un chat
    function deleteChat(chatId) {
        localStorage.removeItem(`chat_${chatId}`);

        // Si era el chat actual, crear uno nuevo
        const currentChatId = localStorage.getItem('current_chat_id');
        if (currentChatId === chatId) {
            createNewChat();
        }

        updateChatList();
    }

    // Función para cargar un chat específico
    function loadChat(chatId) {
        const chatData = localStorage.getItem(`chat_${chatId}`);
        if (!chatData) return false;

        try {
            const chat = JSON.parse(chatData);
            const messagesContainer = document.getElementById('messages');
            messagesContainer.innerHTML = '';

            chat.messages.forEach(msg => {
                addMessageToChat(msg.content, msg.type);
            });

            // Actualizar ID del chat actual
            localStorage.setItem('current_chat_id', chatId);

            return true;
        } catch (error) {
            console.error('Error al cargar chat:', error);
            return false;
        }
    }

    // Función para copiar el contenido completo de un chat al portapapeles
    function copyChatContent(chatId) {
        const chatData = localStorage.getItem(`chat_${chatId}`);
        if (!chatData) return false;

        try {
            const chat = JSON.parse(chatData);
            let content = `Chat: ${chat.title}\n`;
            content += `Fecha: ${new Date(chat.timestamp).toLocaleString()}\n`;
            content += `Número de mensajes: ${chat.messages.length}\n\n`;

            // Agregar cada mensaje con formato
            chat.messages.forEach((msg, index) => {
                const sender = msg.type === 'user' ? 'Usuario' : msg.type === 'bot' ? 'Bot' : 'Sistema';
                content += `--- Mensaje ${index + 1} ---\n`;
                content += `${sender}: ${msg.content}\n\n`;
            });

            // Copiar al portapapeles
            navigator.clipboard.writeText(content).then(() => {
                showNotification('¡Chat copiado al portapapeles!', 'success');
            }).catch(err => {
                console.error('Error al copiar al portapapeles:', err);
                showNotification('Error al copiar el chat al portapapeles', 'error');
            });

            return true;
        } catch (error) {
            console.error('Error al obtener datos del chat:', error);
            return false;
        }
    }

    // Función para cargar y mostrar las claves API
    function loadApiKeys() {
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

    // Función para eliminar una clave API
    async function deleteApiKey(keyId) {
        const result = await showCustomConfirm('¿Seguro que quieres eliminar esta clave API?');
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

    // Mostrar el modal al hacer clic en el botón del logo
    logoToggle?.addEventListener('click', () => {
        loadApiKeys();
        modal?.classList.add('show');
    });

    // Cerrar el modal
    closeModal?.addEventListener('click', () => {
        modal?.classList.remove('show');
    });

    // Toggle para mostrar/ocultar lista de chats
    chatListToggle?.addEventListener('click', () => {
        const isVisible = chatListSidebar.style.left === '0px';
        chatListSidebar.style.left = isVisible ? '-300px' : '0px';

        if (!isVisible) {
            renderChatList();
        }
    });

    // Cerrar lista de chats
    closeChatList?.addEventListener('click', () => {
        chatListSidebar.style.left = '-300px';
    });

    // Crear nuevo chat
    newChatBtn?.addEventListener('click', () => {
        createNewChat();
        chatListSidebar.style.left = '-300px';
        renderChatList();
        input?.focus();
    });

    // Manejar clic en el botón de adjuntar para abrir el selector de archivos
    attachBtn?.addEventListener('click', () => {
        fileInput?.click();
    });

    // Manejar la selección de archivos
    fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                await loadFileContent(file);
                addMessageToChat(`Archivo cargado: ${file.name}`, 'system');
            } catch (error) {
                addMessageToChat(`Error al cargar el archivo: ${error.message}`, 'bot error');
            }
        }
    });

    // Manejar el envío de mensajes
    sendBtn?.addEventListener('click', async () => {
        const message = input.value.trim();
        if (!message && !tempFileContent) return;

        // Construir el prompt completo incluyendo el contenido del archivo si existe
        let fullPrompt = message;
        if (tempFileContent) {
            fullPrompt = `Contenido del archivo adjunto:\n${tempFileContent}\n\nMensaje del usuario: ${message}`;
        }

        // Mostrar el mensaje del usuario (sin el contenido del archivo para simplicidad)
        addMessageToChat(message || '[Archivo adjunto enviado]', 'user');
        input.value = '';

        try {
            // Enviar el mensaje completo a la API de Gemini
            const response = await sendToGemini(fullPrompt);

            // Extraer y mostrar la respuesta
            const botText = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
            addMessageToChat(botText, 'bot');
        } catch (error) {
            addMessageToChat(`Error: ${error.message}`, 'bot error');
        } finally {
            // Limpiar el contenido del archivo después de enviar
            clearTempFileContent();
        }
    });

    // Añadir soporte para enviar mensaje con Enter (sin shift)
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn?.click();
        }
    });

    // Ajustar la altura del textarea automáticamente
    input?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Inicializar modales como ocultos
    document.getElementById('custom-prompt-modal').style.display = 'none';
});

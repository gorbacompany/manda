// chat-manager.js - Gestión de chats y almacenamiento

// Importar funciones necesarias de otros módulos
import { addMessageToChat } from './chat-ui.js';
import { showCustomConfirm, showCustomPrompt } from './ui-modals.js';
import { showNotification } from './utils.js';
import { resetSidebarNavigation } from './sidebar-navigation.js';
import { downloadFile } from './file-downloader.js'; // Importar el nuevo módulo

let chatListSidebarElement = null;
let sidebarOverlayElement = null;
let chatListToggleButton = null;
let closeChatListButton = null;
let newChatButton = null;
let mergeChatsButton = null;
const selectedChatIds = new Set();

// Función para generar ID único para chats
function generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Función para guardar el estado actual del chat
function saveCurrentChat() {
    const messages = Array.from(document.getElementById('messages').children).map(msg => {
        const typeFromClass = msg.className.split(' ')[1] || 'message';
        const storedContent = msg.dataset?.messageContent;
        const storedType = msg.dataset?.messageSender;
        const contentFallback = msg.querySelector('.msg-content')?.textContent || msg.textContent;

        return {
            content: storedContent ?? contentFallback,
            type: storedType ?? typeFromClass
        };
    });

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

function sanitizeFileName(name) {
    return (name || 'chat')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\\/:*?"<>|]+/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 120) || 'chat';
}

function buildChatMarkdown(chat) {
    const lines = [];
    const title = chat.title?.trim() || 'Conversación sin título';
    lines.push(`# ${title}`);

    if (chat.timestamp) {
        lines.push(`*Fecha:* ${new Date(chat.timestamp).toLocaleString()}`);
    }

    lines.push(`*Mensajes:* ${chat.messages?.length ?? 0}`);
    lines.push('');

    (chat.messages || []).forEach((msg, index) => {
        const sender = msg.type === 'user' ? 'Usuario' : msg.type === 'bot' ? 'Asistente' : 'Sistema';
        lines.push(`## Mensaje ${index + 1} — ${sender}`);
        lines.push('');
        lines.push(msg.content || '');
        lines.push('');
    });

    return lines.join('\n');
}

function downloadChatMarkdown(chatId) {
    const chatData = localStorage.getItem(`chat_${chatId}`);
    if (!chatData) {
        showNotification('No se encontraron datos del chat', 'error');
        return false;
    }

    try {
        const chat = JSON.parse(chatData);
        const markdownContent = buildChatMarkdown(chat);
        const fileName = `${sanitizeFileName(chat.title)}.md`;

        // Usar el nuevo módulo de descarga
        const success = downloadFile(fileName, markdownContent, 'text/markdown;charset=utf-8');

        if (success) {
            showNotification('Chat descargado en Markdown', 'success');
        } else {
            showNotification('No se pudo descargar el chat', 'error');
        }
        return success;
    } catch (error) {
        console.error('Error al procesar el chat para la descarga:', error);
        showNotification('Error al procesar el chat', 'error');
        return false;
    }
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

    document.dispatchEvent(new CustomEvent('chats:updated', {
        detail: {
            count: chatList.length,
            currentChatId
        }
    }));

    return { chatList, currentChatId };
}

function renameChat(chatId, newTitle) {
    if (!chatId || !newTitle) return;
    const key = `chat_${chatId}`;
    const chatDataRaw = localStorage.getItem(key);
    if (!chatDataRaw) return;

    try {
        const chatData = JSON.parse(chatDataRaw);
        chatData.title = newTitle;
        localStorage.setItem(key, JSON.stringify(chatData));

        const currentChatId = localStorage.getItem('current_chat_id');
        if (currentChatId === chatId) {
            document.dispatchEvent(new CustomEvent('chat:titleUpdated', {
                detail: { chatId, title: newTitle }
            }));
        }
    } catch (error) {
        console.error('Error al renombrar chat:', error);
        showNotification('No se pudo renombrar el chat', 'error');
    }
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
    if (selectedChatIds.has(chatId)) {
        selectedChatIds.delete(chatId);
        updateMergeButtonState();
    }

    const currentChatId = localStorage.getItem('current_chat_id');
    if (currentChatId === chatId) {
        createNewChat();
    }

    updateChatList();

    document.dispatchEvent(new CustomEvent('chats:updated'));
}

// Función para configurar la gestión de chats
function setupChatList() {
    chatListSidebarElement = document.getElementById('chat-list-sidebar');
    chatListToggleButton = document.getElementById('chat-list-toggle');
    closeChatListButton = document.getElementById('close-chat-list');
    newChatButton = document.getElementById('new-chat-btn');
    mergeChatsButton = document.getElementById('merge-chats-btn');
    sidebarOverlayElement = document.querySelector('.sidebar-overlay');

    chatListToggleButton?.addEventListener('click', () => {
        const isOpen = chatListSidebarElement?.classList.contains('open');
        if (isOpen) {
            closeSidebar();
        } else {
            resetSidebarNavigation();
            openSidebar();
        }
    });

    closeChatListButton?.addEventListener('click', closeSidebar);

    sidebarOverlayElement?.addEventListener('click', closeSidebar);

    newChatButton?.addEventListener('click', () => {
        createNewChat();
        clearChatSelection();
        renderChatList();
        closeSidebar();
        document.getElementById('input')?.focus();
    });

    mergeChatsButton?.addEventListener('click', handleMergeSelectedChats);

    window.addEventListener('resize', () => {
        if (!chatListSidebarElement) return;
        if (chatListSidebarElement.classList.contains('open')) {
            updateOverlayState();
        }
    });

    document.addEventListener('sidebar:section-enter', (event) => {
        if (event.detail?.sectionId === 'history') {
            renderChatList();
        }
    });

    document.addEventListener('sidebar:panel-root', () => {
        const container = document.getElementById('chat-list-container');
        container?.scrollTo({ top: 0, behavior: 'auto' });
        clearChatSelection();
    });

    const handleGlobalPointerDown = (event) => {
        if (!chatListSidebarElement?.classList.contains('open')) return;
        const target = event.target;
        if (chatListSidebarElement.contains(target)) return;
        if (chatListToggleButton?.contains(target)) return;
        closeSidebar();
    };

    const handleFocusIn = (event) => {
        if (!chatListSidebarElement?.classList.contains('open')) return;
        const target = event.target;
        if (chatListSidebarElement.contains(target)) return;
        if (chatListToggleButton?.contains(target)) return;
        closeSidebar();
    };

    document.addEventListener('pointerdown', handleGlobalPointerDown, true);
    document.addEventListener('focusin', handleFocusIn, true);

    updateMergeButtonState();
}

function openSidebar() {
    if (!chatListSidebarElement) return;
    chatListSidebarElement.classList.add('open');
    document.body.classList.add('sidebar-open');
    updateOverlayState();
}

function closeSidebar() {
    if (!chatListSidebarElement) return;
    chatListSidebarElement.classList.remove('open');
    if (chatListSidebarElement.contains(document.activeElement)) {
        chatListToggleButton?.focus({ preventScroll: true });
    }
    document.body.classList.remove('sidebar-open');
    sidebarOverlayElement?.classList.remove('active');
    resetSidebarNavigation();
}

function updateOverlayState() {
    if (!sidebarOverlayElement) return;
    if (window.innerWidth <= 1024) {
        sidebarOverlayElement.classList.add('active');
    } else {
        sidebarOverlayElement.classList.remove('active');
    }
}

// Función para renderizar la lista de chats (versión mejorada)
function renderChatList() {
    const { chatList, currentChatId } = updateChatList();
    const chatListContainer = document.getElementById('chat-list-container');
    if (!chatListContainer) return;

    chatListContainer.innerHTML = '';

    if (chatList.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'chat-list-empty';
        emptyDiv.textContent = 'No hay chats guardados';
        chatListContainer.appendChild(emptyDiv);
        return;
    }

    chatList.forEach(chat => {
        const isActive = chat.id === currentChatId;
        const isSelected = selectedChatIds.has(chat.id);

        // Contenedor principal del item
        const chatItem = document.createElement('div');
        chatItem.className = `chat-list-item${isActive ? ' active' : ''}${isSelected ? ' selected' : ''}`;
        chatItem.dataset.chatId = chat.id;
        chatItem.addEventListener('click', () => {
            clearChatSelection();
            loadChat(chat.id);
            closeSidebar();
            renderChatList();
        });

        // Checkbox de selección
        const selectionCheckbox = document.createElement('input');
        selectionCheckbox.type = 'checkbox';
        selectionCheckbox.className = 'chat-select-checkbox';
        selectionCheckbox.checked = isSelected;
        selectionCheckbox.addEventListener('click', e => e.stopPropagation());
        selectionCheckbox.addEventListener('change', e => {
            toggleChatSelection(chat.id, e.target.checked);
            chatItem.classList.toggle('selected', e.target.checked);
        });

        // Contenedor para el contenido principal (título, meta, controles)
        const contentContainer = document.createElement('div');
        contentContainer.className = 'chat-item-content';

        // Cabecera con título y controles
        const headerContainer = document.createElement('div');
        headerContainer.className = 'chat-item-header';

        const title = document.createElement('div');
        title.className = 'chat-title';
        title.textContent = chat.title || 'Chat sin título';

        const actions = [
            {
                label: 'Copiar',
                class: 'chat-copy-btn',
                icon: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
                handler: copyChatContent
            },
            {
                label: 'Descargar',
                class: 'chat-download-btn',
                icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',
                handler: downloadChatMarkdown
            },
            {
                label: 'Renombrar',
                class: 'chat-rename-btn',
                icon: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>',
                handler: async () => {
                const newTitle = await showCustomPrompt('Renombrar chat', chat.title || '');
                if (typeof newTitle === 'string' && newTitle.trim()) {
                    renameChat(chat.id, newTitle.trim());
                    renderChatList();
                    showNotification('Título actualizado', 'success');
                }
            }
            },
            {
                label: 'Eliminar',
                class: 'chat-delete-btn',
                icon: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>',
                handler: async () => {
                const result = await showCustomConfirm('¿Eliminar este chat?');
                if (result) {
                    deleteChat(chat.id);
                    renderChatList();
                }
            }
            }
        ];

        // Meta información (fecha, etc.)
        const meta = document.createElement('div');
        meta.className = 'chat-meta';
        meta.textContent = `${chat.messageCount} mensajes • ${formatDate(chat.timestamp)}`;

        const footerControls = document.createElement('div');
        footerControls.className = 'chat-controls';

        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `chat-control-btn ${action.class}`;
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${action.icon}</svg><span class="sr-only">${action.label}</span>`;
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const result = await action.handler(chat.id);
                return result;
            });
            footerControls.appendChild(btn);
        });

        // Ensamblar todo
        headerContainer.appendChild(title);
        contentContainer.appendChild(headerContainer);
        contentContainer.appendChild(meta);
        contentContainer.appendChild(footerControls);
        chatItem.appendChild(selectionCheckbox);
        chatItem.appendChild(contentContainer);

        chatListContainer.appendChild(chatItem);
    });
}

function toggleChatSelection(chatId, isSelected) {
    if (isSelected) {
        selectedChatIds.add(chatId);
    } else {
        selectedChatIds.delete(chatId);
    }
    updateMergeButtonState();
}

function clearChatSelection() {
    if (selectedChatIds.size === 0) {
        updateMergeButtonState();
        return;
    }
    selectedChatIds.clear();
    document.querySelectorAll('.chat-select-checkbox').forEach((checkbox) => {
        checkbox.checked = false;
    });
    document.querySelectorAll('.chat-list-item.selected').forEach((item) => {
        item.classList.remove('selected');
    });
    updateMergeButtonState();
}

function updateMergeButtonState() {
    if (!mergeChatsButton) return;
    const shouldDisable = selectedChatIds.size < 2;
    mergeChatsButton.disabled = shouldDisable;
}

function handleMergeSelectedChats() {
    if (selectedChatIds.size < 2) {
        return;
    }
    const chatIds = Array.from(selectedChatIds);
    const mergedChatId = mergeChats(chatIds);
    if (!mergedChatId) {
        showNotification('No se pudo fusionar los chats seleccionados', 'error');
        return;
    }
    clearChatSelection();
    loadChat(mergedChatId);
    renderChatList();
    showNotification('Chats fusionados correctamente', 'success');
}

function mergeChats(chatIds) {
    if (!Array.isArray(chatIds) || chatIds.length < 2) {
        return null;
    }

    const uniqueIds = Array.from(new Set(chatIds)).filter(Boolean);
    if (uniqueIds.length < 2) {
        return null;
    }

    const chatsToMerge = [];

    uniqueIds.forEach(chatId => {
        const storedChat = localStorage.getItem(`chat_${chatId}`);
        if (!storedChat) {
            return;
        }

        try {
            const parsedChat = JSON.parse(storedChat);
            if (!parsedChat?.messages || !Array.isArray(parsedChat.messages)) {
                return;
            }

            chatsToMerge.push(parsedChat);
        } catch (error) {
            console.error('Error al parsear chat para fusión:', error);
        }
    });

    if (chatsToMerge.length < 2) {
        return null;
    }

    chatsToMerge.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeA - timeB;
    });

    const mergedMessages = [];

    chatsToMerge.forEach(chat => {
        chat.messages.forEach((message, index) => {
            if (!message || typeof message !== 'object') {
                return;
            }

            mergedMessages.push({
                content: message.content ?? '',
                type: message.type ?? 'message',
                timestamp: message.timestamp || `${chat.timestamp || ''}#${index}`
            });
        });
    });

    if (mergedMessages.length === 0) {
        return null;
    }

    mergedMessages.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        if (timeA === timeB) {
            return 0;
        }
        return timeA - timeB;
    });

    const mergedChatId = generateChatId();
    const sanitizedMessages = mergedMessages.map(({ content, type }) => ({ content, type }));

    const mergedChatData = {
        id: mergedChatId,
        timestamp: new Date().toISOString(),
        messages: sanitizedMessages,
        title: getChatTitle(sanitizedMessages)
    };

    localStorage.setItem(`chat_${mergedChatId}`, JSON.stringify(mergedChatData));
    updateChatList();

    return mergedChatId;
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

// Exportar funciones necesarias
export {
    setupChatList,
    createNewChat,
    loadChat,
    saveCurrentChat,
    getChatList,
    copyChatContent,
    downloadChatMarkdown,
    deleteChat,
    mergeChats
};

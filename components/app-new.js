// app.js - Archivo principal de la aplicación de chat con Gemini

// Importar módulos
import { sendToGemini } from './google-api.js';
import { tempFileContent, loadFileContent, clearTempFileContent } from './file-handler.js';
import {
    generateChatId,
    saveCurrentChat,
    getChatTitle,
    copyChatContent,
    loadChat,
    getChatList,
    updateChatList,
    createNewChat,
    deleteChat
} from './chat-manager.js';
import { showCustomPrompt, showCustomConfirm } from './ui-modals.js';
import { initializeChatSystem, renderChatList, formatDate, addMessageToChat } from './chat-ui.js';
import { deleteApiKey, renameApiKey, toggleApiKey } from './api-keys-manager.js';
import { loadApiKeys } from './api-keys-ui.js';

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

    // Inicializar el sistema de chats
    initializeChatSystem();

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
});

// Exportar funciones que pueden ser utilizadas por otros módulos si es necesario
export {
    sendToGemini,
    tempFileContent,
    loadFileContent,
    clearTempFileContent,
    generateChatId,
    saveCurrentChat,
    getChatTitle,
    copyChatContent,
    loadChat,
    getChatList,
    updateChatList,
    createNewChat,
    deleteChat,
    showCustomPrompt,
    showCustomConfirm,
    initializeChatSystem,
    renderChatList,
    formatDate,
    addMessageToChat,
    deleteApiKey,
    renameApiKey,
    toggleApiKey,
    loadApiKeys
};

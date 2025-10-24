// app.js - Archivo principal de la aplicación de chat con Gemini

// Importar módulos
import { setupChatUI } from './chat-ui.js';
import { setupApiKeyModal } from './api-keys.js';
import { setupFileHandler } from './file-handler.js';
import { setupModals } from './ui-modals.js';
import { setupChatList } from './chat-manager.js';
import { createFloatingControls } from './floating-controls.js';

// Configuración inicial cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar todos los módulos
    setupChatUI();
    setupApiKeyModal();
    setupChatList();
    setupFileHandler();
    setupModals();

    // Crear controles flotantes de configuración de IA
    createFloatingControls();
});

// Exportar funciones que pueden ser utilizadas por otros módulos si es necesario
export {
    setupChatUI,
    setupApiKeyModal,
    setupFileHandler,
    setupModals,
    setupChatList,
    createFloatingControls
};

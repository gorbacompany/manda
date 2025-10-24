// index.js - Punto de entrada principal de la aplicación

// Importar módulos principales
import { sendToGemini } from './google-api.js';
import {
    getTempFileContent,
    clearTempFileContent,
    setupFileHandler,
    getPendingAttachments,
    clearPendingAttachments,
    setAttachmentsStatus,
    showSendStatus
} from './file-handler.js';
import { setupChatList, createNewChat, loadChat, saveCurrentChat, getChatList, copyChatContent, deleteChat } from './chat-manager.js';
import { showCustomPrompt, showCustomConfirm, setupModals } from './ui-modals.js';
import { addMessageToChat, setupChatUI } from './chat-ui.js';
import { initializeApiKeys, loadApiKeys } from './api-keys.js';
import { initializeInfoPanels } from './floating-controls.js';
import { initializeSidebarNavigation, resetSidebarNavigation } from './sidebar-navigation.js';
import { setupInputTray } from '../scripts/input-tray.js';

// Exportar funciones globales para que estén disponibles en toda la aplicación
window.sendToGemini = sendToGemini;
window.getTempFileContent = getTempFileContent;
window.clearTempFileContent = clearTempFileContent;
window.getPendingAttachments = getPendingAttachments;
window.clearPendingAttachments = clearPendingAttachments;
window.setAttachmentsStatus = setAttachmentsStatus;
window.showSendStatus = showSendStatus;
window.setupChatList = setupChatList;
window.createNewChat = createNewChat;
window.loadChat = loadChat;
window.saveCurrentChat = saveCurrentChat;
window.getChatList = getChatList;
window.copyChatContent = copyChatContent;
window.deleteChat = deleteChat;
window.showCustomPrompt = showCustomPrompt;
window.showCustomConfirm = showCustomConfirm;
window.addMessageToChat = addMessageToChat;
window.setupChatUI = setupChatUI;
window.loadApiKeys = loadApiKeys;
window.initializeSidebarNavigation = initializeSidebarNavigation;
window.resetSidebarNavigation = resetSidebarNavigation;
window.setupInputTray = setupInputTray;

// Configuración inicial cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando aplicación Indigo Chat...');

    // Inicializar todos los módulos
    setupChatUI();
    initializeApiKeys();
    setupChatList();
    setupFileHandler();
    setupModals();
    initializeInfoPanels();
    initializeSidebarNavigation();
    setupInputTray();

    console.log('✅ Aplicación inicializada correctamente');
});

// Exportar para uso en otros módulos si es necesario
export {
    sendToGemini,
    getTempFileContent,
    clearTempFileContent,
    setupChatList,
    createNewChat,
    loadChat,
    saveCurrentChat,
    getChatList,
    copyChatContent,
    deleteChat,
    showCustomPrompt,
    showCustomConfirm,
    addMessageToChat,
    setupChatUI,
    initializeApiKeys,
    initializeInfoPanels,
    loadApiKeys,
    initializeSidebarNavigation,
    resetSidebarNavigation,
    setupInputTray
};

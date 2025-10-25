// scripts/input-tray.js - Lógica para el área de entrada de texto

import { sendToGemini } from './google-api.js';
import { getPendingAttachments, setAttachmentsStatus, showSendStatus, clearPendingAttachments } from './file-handler.js';
import { addMessageToChat } from './chat-ui.js';
import { getCurrentAIConfig } from './ai-config.js';

// Estimación de tokens (aprox 1 token por 4 caracteres)
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}

// Función para construir la visualización de los adjuntos
function buildAttachmentDisplay(attachments, text) {
    if (!attachments.length) {
        return text;
    }
    const lines = attachments.map((attachment) => `• ${attachment.name}`);
    const attachmentBlock = `Adjuntos:\n${lines.join('\n')}`;
    return text ? `${text}\n\n${attachmentBlock}` : attachmentBlock;
}

// Función para construir el payload del prompt
function buildPromptPayload(history, text, attachments) {
    const config = getCurrentAIConfig();

    const lines = [];
    if (config.systemPrompt?.trim()) {
        lines.push(`System prompt:\n${config.systemPrompt.trim()}`);
    }

    if (history && history.length > 0) {
        const formattedHistory = history.map((entry) => {
            const roleLabel = entry.role === 'user' ? 'Usuario' : entry.role === 'bot' ? 'Asistente' : 'Sistema';
            return `${roleLabel}: ${entry.content}`;
        }).join('\n\n');
        lines.push(`Historial de conversación:\n${formattedHistory}`);
    }

    if (attachments.length) {
        const summary = attachments.map((attachment, index) => {
            const typeLabel = attachment.type || 'tipo desconocido';
            const sizeLabel = Number.isFinite(attachment.size) ? `${Math.max(1, Math.round(attachment.size / 1024))} KB` : '';
            const suffix = [typeLabel, sizeLabel].filter(Boolean).join(' · ');
            return `${index + 1}. ${attachment.name}${suffix ? ` (${suffix})` : ''}`;
        }).join('\n');
        lines.push(`Archivos adjuntos:\n${summary}`);
    }

    if (text?.trim()) {
        lines.push(`Mensaje del usuario:\n${text.trim()}`);
    }

    return lines.join('\n\n');
}

function buildGeminiContents(promptText, attachments) {
    const parts = [];

    if (promptText.trim().length) {
        parts.push({ text: promptText });
    }

    attachments.forEach((attachment) => {
        if (attachment.inlineData) {
            parts.push({ inlineData: attachment.inlineData });
        } else if (typeof attachment.content === 'string' && attachment.content.trim().length) {
            parts.push({
                text: `Contenido de ${attachment.name}:\n${attachment.content.trim()}`
            });
        } else if (attachment.inlineDataTooLarge) {
            parts.push({
                text: `Resumen requerido para ${attachment.name}: archivo excede 8MB y no se pudo incrustar.`
            });
        }
    });

    if (!parts.length) {
        parts.push({ text: 'Mensaje del usuario sin contenido textual ni adjuntos compatibles.' });
    }

    return [
        {
            role: 'user',
            parts
        }
    ];
}

// Extraer el historial actual de la conversación desde el DOM
function getConversationHistory() {
    const messageNodes = Array.from(document.querySelectorAll('#messages .msg'));

    return messageNodes.map((node) => {
        const role = node.classList.contains('bot')
            ? 'bot'
            : node.classList.contains('user')
                ? 'user'
                : 'system';

        const stored = node.dataset?.messageContent;
        const content = stored ?? node.querySelector('.msg-content')?.textContent ?? node.textContent ?? '';

        return {
            role,
            content: (content || '').trim()
        };
    }).filter((entry) => entry.content.length);
}

// Función para manejar el envío de mensajes
async function handleSendMessage() {
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('sendBtn');
    const fileInput = document.getElementById('fileInput');
    const rawText = input.value.trim();
    const attachments = [...getPendingAttachments()];

    if (!rawText && !attachments.length) return;

    const displayText = buildAttachmentDisplay(attachments, rawText) || '[Mensaje enviado]';

    // Obtener historial antes de añadir el mensaje del usuario
    const history = getConversationHistory();

    addMessageToChat(displayText, 'user', {
        rawText,
        attachments,
        copyValue: rawText || displayText
    });

    input.value = '';
    adjustTextareaHeight(input);
    updateSendButtonState(input, fileInput, sendBtn);

    if (attachments.length) {
        setAttachmentsStatus('enviando', 'Enviando…');
        showSendStatus('Enviando adjuntos…', 'pending');
    } else {
        showSendStatus('Enviando mensaje…', 'pending');
    }

    let sendSucceeded = false;

    try {
        const prompt = buildPromptPayload(history, rawText, attachments);
        const contents = buildGeminiContents(prompt, attachments);
        const response = await sendToGemini(contents);
        const botText = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
        addMessageToChat(botText, 'bot');

        if (attachments.length) {
            setAttachmentsStatus('listo', 'Listo');
        }
        showSendStatus('Mensaje enviado', 'success');
        sendSucceeded = true;
    } catch (error) {
        addMessageToChat(`Error: ${error.message}`, 'bot error');
        if (attachments.length) {
            setAttachmentsStatus('error', 'Error');
        }
        showSendStatus('No se pudo enviar', 'error');
    } finally {
        if (sendSucceeded) {
            clearPendingAttachments();
        }
        updateSendButtonState(input, fileInput, sendBtn);
        setTimeout(() => showSendStatus('', ''), 1500);
    }
}

// Función para ajustar la altura del textarea
function adjustTextareaHeight(textarea) {
    if (!textarea) return;
    const style = window.getComputedStyle(textarea);
    const minHeight = parseInt(style.getPropertyValue('--input-min-height') || '48', 10);
    const maxHeight = parseInt(style.getPropertyValue('--input-max-height') || '200', 10);

    textarea.style.height = 'auto';
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
}

// Función para actualizar el estado del botón de envío
function updateSendButtonState(textarea, fileInput, sendBtn) {
    if (!sendBtn) return;

    const hasText = textarea?.value.trim().length > 0;
    const hasFile = !!fileInput?.files?.length;
    let hasPendingAttachments = false;
    try {
        hasPendingAttachments = getPendingAttachments().length > 0;
    } catch (error) {
        // Ignorar si no está disponible todavía
    }
    const isReady = hasText || hasFile || hasPendingAttachments;

    sendBtn.classList.toggle('send-btn--ready', isReady);

    if (sendBtn.querySelector('.send-icon')) {
        sendBtn.querySelector('.send-icon').classList.toggle('send-icon--active', isReady);
    }
}

// Función para configurar la bandeja de entrada
export function setupInputTray() {
    const sendBtn = document.getElementById('sendBtn');
    const input = document.getElementById('input');
    const fileInput = document.getElementById('fileInput');

    // Manejar el envío de mensajes
    sendBtn?.addEventListener('click', handleSendMessage);

    // Añadir soporte para enviar mensaje con Enter (sin shift)
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Ajustar la altura del textarea automáticamente
    if (input) {
        input.addEventListener('input', () => {
            adjustTextareaHeight(input);
            updateSendButtonState(input, fileInput, sendBtn);
        });
        adjustTextareaHeight(input);
    }

    fileInput?.addEventListener('change', () => {
        updateSendButtonState(input, fileInput, sendBtn);
    });

    updateSendButtonState(input, fileInput, sendBtn);

    window.addEventListener('attachments:updated', () => {
        updateSendButtonState(input, fileInput, sendBtn);
    });

    // --- Interfaz para la App Nativa de Android ---
    // Expone una función en el objeto `window` que Android puede llamar.
    window.androidInterface = {
        updateSystemBarHeight: (statusBarHeightInPx) => {
            const height = statusBarHeightInPx || 0;
            console.log(`Received status bar height from Android: ${height}px`);
            // Aplica la altura como una variable CSS en la raíz del documento.
            document.documentElement.style.setProperty('--status-bar-height', `${height}px`);
        },

        /**
         * Recibe un objeto JSON con información detallada del dispositivo Android.
         * @param {string} jsonString El JSON como cadena de texto.
         */
        updateDeviceInfo: (jsonString) => {
            try {
                const deviceInfo = JSON.parse(jsonString);
                console.log('Received device info from Android:', deviceInfo);

                // Aquí puedes usar la información para adaptar la UI.
                // Por ejemplo, para el tema del sistema:
                if (deviceInfo.systemTheme === 'dark') {
                    document.documentElement.classList.add('dark-theme-android');
                } else {
                    document.documentElement.classList.remove('dark-theme-android');
                }

                // Para la altura de la barra de estado (redundante con updateSystemBarHeight,
                // pero puedes usar el valor de deviceInfo si prefieres centralizarlo aquí):
                document.documentElement.style.setProperty('--status-bar-height', `${deviceInfo.statusBarHeightPx || 0}px`);

                // Para la altura de la barra de navegación (para navegación por gestos):
                document.documentElement.style.setProperty('--navigation-bar-height', `${deviceInfo.navigationBarHeightPx || 0}px`);

                // Para el notch:
                if (deviceInfo.hasNotch) {
                    document.documentElement.style.setProperty('--notch-height', `${deviceInfo.notchHeightPx || 0}px`);
                    document.documentElement.classList.add('has-notch');
                } else {
                    document.documentElement.style.setProperty('--notch-height', '0px');
                    document.documentElement.classList.remove('has-notch');
                }
                
                // Para el ancho de la ventana:
                document.documentElement.style.setProperty('--total-window-width', `${deviceInfo.totalWindowWidthPx || 0}px`);

                // Puedes almacenar esta información en una variable global de JS
                // o pasársela a un sistema de estado para que otros componentes la utilicen.
                window.androidDeviceInfo = deviceInfo;

            } catch (e) {
                console.error('Error parsing device info JSON from Android:', e);
            }
        }
    };
    // Llama a la función con 0 por si la app nativa no la llama, para tener un valor por defecto.
    window.androidInterface.updateSystemBarHeight(0);


    // --- Detección de Teclado Virtual para Android ---
    // Heurística para detectar si el teclado está abierto
    const handleKeyboardVisibility = () => {
        const isKeyboardOpen = window.visualViewport.height < window.outerHeight * 0.7;
        document.body.classList.toggle('keyboard-open', isKeyboardOpen);

        // Calcular la altura del teclado virtual y establecerla como variable CSS
        const keyboardHeight = window.outerHeight - window.visualViewport.height;
        document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
    };

    window.visualViewport.addEventListener('resize', handleKeyboardVisibility);
}

// chat-ui.js - Interfaz de usuario del chat

import { sendToGemini } from './google-api.js';
import { copyToClipboard } from './utils.js';
import { saveCurrentChat } from './chat-manager.js';
import { getPendingAttachments, setAttachmentsStatus, showSendStatus, clearPendingAttachments } from './file-handler.js';

const ACTION_ICONS = {
    copy: `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M16 3H8a2 2 0 0 0-2 2v10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M10 7h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `,
    delete: `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 7h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M10 11v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M14 11v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>
            <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `,
    regenerate: `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="m21 4-2 4-4-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `
};

const CODE_COPY_ICON = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 3H6a2 2 0 0 0-2 2v12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M10 7h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
`;

const mathRenderQueue = [];
let resizeTimer = null;

function buildAttachmentDisplay(attachments, text) {
    if (!attachments.length) {
        return text;
    }
    const lines = attachments.map((attachment) => `• ${attachment.name}`);
    const attachmentBlock = `Adjuntos:\n${lines.join('\n')}`;
    return text ? `${text}\n\n${attachmentBlock}` : attachmentBlock;
}

function buildPromptPayload(text, attachments) {
    const sections = [];

    if (attachments.length) {
        const summary = attachments.map((attachment, index) => {
            const typeLabel = attachment.type || 'tipo desconocido';
            const sizeLabel = Number.isFinite(attachment.size) ? `${Math.max(1, Math.round(attachment.size / 1024))} KB` : '';
            const suffix = [typeLabel, sizeLabel].filter(Boolean).join(' · ');
            return `${index + 1}. ${attachment.name}${suffix ? ` (${suffix})` : ''}`;
        }).join('\n');
        sections.push(`Archivos adjuntos proporcionados por el usuario:\n${summary}`);

        const textualAttachments = attachments.filter((attachment) => typeof attachment.content === 'string' && attachment.content.trim().length);
        if (textualAttachments.length) {
            const combinedText = textualAttachments.map((attachment) => `--- ${attachment.name} ---\n${attachment.content}`).join('\n\n');
            sections.push(`Contenido textual de los adjuntos:\n${combinedText}`);
        }
    }

    if (text) {
        sections.push(`Mensaje del usuario:\n${text}`);
    }

    return sections.join('\n\n');
}

function ensureMarkedConfiguration() {
    if (!window.marked || ensureMarkedConfiguration.configured) return;

    window.marked.setOptions({
        gfm: true,
        breaks: true,
        highlight(code, language) {
            try {
                if (language && window.hljs?.getLanguage(language)) {
                    return window.hljs.highlight(code, { language }).value;
                }
                if (window.hljs) {
                    return window.hljs.highlightAuto(code).value;
                }
            } catch (error) {
                console.warn('Highlight error:', error);
            }
            return code;
        }
    });

    ensureMarkedConfiguration.configured = true;
}

function scheduleMathRendering(element) {
    if (!element) return;
    if (window.renderMathInElement) {
        window.renderMathInElement(element, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        });
    } else {
        mathRenderQueue.push(element);
    }
}

window.addEventListener('load', () => {
    if (!mathRenderQueue.length || !window.renderMathInElement) return;
    const uniqueElements = Array.from(new Set(mathRenderQueue));
    uniqueElements.forEach((el) => scheduleMathRendering(el));
    mathRenderQueue.length = 0;
});

// Función para inicializar la interfaz del chat
export function initializeChatUI() {
    // Aquí se puede añadir lógica de inicialización específica de la UI
    // Por ahora, el sistema de chats se inicializa desde chat-manager.js
}

// Función para manejar el envío de mensajes
export async function handleSendMessage() {
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('sendBtn');
    const fileInput = document.getElementById('fileInput');
    const rawText = input.value.trim();
    const attachments = [...getPendingAttachments()];

    if (!rawText && !attachments.length) return;

    const displayText = buildAttachmentDisplay(attachments, rawText) || '[Mensaje enviado]';

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
        const prompt = buildPromptPayload(rawText, attachments);
        const response = await sendToGemini(prompt);
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

// Función para añadir mensajes al chat
function createMessageActions({ onCopy, onDelete, onRegenerate }) {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'msg-action copy';
    copyBtn.innerHTML = `${ACTION_ICONS.copy}<span class="sr-only">Copiar mensaje</span>`;
    copyBtn.addEventListener('click', onCopy);
    actions.appendChild(copyBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'msg-action delete';
    deleteBtn.innerHTML = `${ACTION_ICONS.delete}<span class="sr-only">Borrar mensaje</span>`;
    deleteBtn.addEventListener('click', onDelete);
    actions.appendChild(deleteBtn);

    if (typeof onRegenerate === 'function') {
        const regenerateBtn = document.createElement('button');
        regenerateBtn.type = 'button';
        regenerateBtn.className = 'msg-action regenerate';
        regenerateBtn.innerHTML = `${ACTION_ICONS.regenerate}<span class="sr-only">Repetir mensaje</span>`;
        regenerateBtn.addEventListener('click', onRegenerate);
        actions.appendChild(regenerateBtn);
    }

    return actions;
}

function renderMarkdown(text) {
    ensureMarkedConfiguration();

    const rawHtml = window.marked.parse(text, { gfm: true, breaks: true });
    const cleanHtml = window.DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-content';
    wrapper.innerHTML = cleanHtml;

    wrapper.querySelectorAll('p').forEach((paragraph) => {
        if (!paragraph.textContent.trim()) {
            paragraph.remove();
        }
    });

    if (window.hljs?.highlightElement) {
        wrapper.querySelectorAll('pre code').forEach((block) => {
            window.hljs.highlightElement(block);
        });
    }

    wrapper.querySelectorAll('pre').forEach((pre) => {
        pre.classList.add('code-block');
        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.className = 'code-copy-btn';
        copyButton.innerHTML = `${CODE_COPY_ICON}<span class="sr-only">Copiar bloque de código</span>`;
        copyButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const code = pre.querySelector('code')?.textContent ?? '';
            if (code) {
                copyToClipboard(code);
            }
        });
        pre.appendChild(copyButton);
    });

    scheduleMathRendering(wrapper);

    return wrapper;
}

function adjustMessageWidth(container, sender) {
    const messagesContainer = document.getElementById('messages');
    const containerWidth = messagesContainer?.clientWidth || window.innerWidth;
    const botMax = containerWidth * 1;
    const userMax = containerWidth * 0.9;

    if (sender === 'bot') {
        container.style.width = '100%';
        container.style.maxWidth = `${botMax}px`;
        container.style.alignSelf = 'stretch';
        container.style.marginLeft = '0';
        container.style.marginRight = '0';
    } else {
        container.style.alignSelf = 'flex-end';
        container.style.maxWidth = `${userMax}px`;
        container.style.width = 'fit-content';
        container.style.marginLeft = 'auto';
        container.style.marginRight = '0';
    }
}

function removeMessage(container) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.removeChild(container);
    saveCurrentChat();
    refreshRegenerateButtons();
}

function handleRegenerate(messageWrapper) {
    const rawText = messageWrapper.dataset.rawText || messageWrapper.dataset.messageContent || '';
    if (!rawText.trim()) {
        return;
    }

    const input = document.getElementById('input');
    if (input) {
        input.value = rawText;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    handleSendMessage();
}

function refreshRegenerateButtons() {
    const userMessages = Array.from(document.querySelectorAll('#messages .msg.user'));
    userMessages.forEach((message, index) => {
        const regenerateBtn = message.querySelector('.msg-action.regenerate');
        if (!regenerateBtn) return;
        const isLast = index === userMessages.length - 1;
        regenerateBtn.classList.toggle('regenerate--visible', isLast);
        regenerateBtn.hidden = !isLast;
        regenerateBtn.tabIndex = isLast ? 0 : -1;
        regenerateBtn.setAttribute('aria-hidden', isLast ? 'false' : 'true');
    });
}

export function addMessageToChat(text, sender, options = {}) {
    const messagesContainer = document.getElementById('messages');
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `msg ${sender}`;
    messageWrapper.dataset.messageContent = text;
    messageWrapper.dataset.messageSender = sender;

    if (sender === 'user') {
        const rawValue = typeof options.rawText === 'string' ? options.rawText : text;
        messageWrapper.dataset.rawText = rawValue;
        if (Array.isArray(options.attachments) && options.attachments.length) {
            messageWrapper.dataset.attachments = JSON.stringify(options.attachments.map(({ name, type, size }) => ({ name, type, size })));
        }
        if (options.copyValue) {
            messageWrapper.dataset.copyValue = options.copyValue;
        }
    }

    adjustMessageWidth(messageWrapper, sender);

    const content = renderMarkdown(text);
    messageWrapper.appendChild(content);

    const actions = createMessageActions({
        onCopy: () => copyToClipboard(messageWrapper.dataset.copyValue || text),
        onDelete: () => removeMessage(messageWrapper),
        onRegenerate: sender === 'user' ? () => handleRegenerate(messageWrapper) : undefined
    });

    messageWrapper.appendChild(actions);

    messagesContainer.appendChild(messageWrapper);
    optimizeMessageLayout(messageWrapper);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    saveCurrentChat();
    refreshRegenerateButtons();
}

// Función para configurar la interfaz del chat
export function setupChatUI() {
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

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            document.querySelectorAll('#messages .msg').forEach((msg) => optimizeMessageLayout(msg));
        }, 120);
    });
}

function optimizeMessageLayout(messageWrapper) {
    if (!messageWrapper) return;

    const sender = messageWrapper.dataset.messageSender;
    const content = messageWrapper.querySelector('.msg-content');

    if (sender !== 'bot' && content) {
        requestAnimationFrame(() => {
            const messagesContainer = document.getElementById('messages');
            const availableWidth = messagesContainer?.clientWidth || window.innerWidth;
            const maxWidth = availableWidth * 0.9;
            const measuredWidth = Math.min(maxWidth, Math.max(220, content.scrollWidth + 48));
            messageWrapper.style.width = `${measuredWidth}px`;
        });
    } else if (sender === 'bot') {
        requestAnimationFrame(() => {
            const messagesContainer = document.getElementById('messages');
            const availableWidth = messagesContainer?.clientWidth || window.innerWidth;
            messageWrapper.style.maxWidth = `${availableWidth}px`;
            messageWrapper.style.width = '100%';
        });
    }
}

function adjustTextareaHeight(textarea) {
    if (!textarea) return;
    const style = window.getComputedStyle(textarea);
    const minHeight = parseInt(style.getPropertyValue('--input-min-height') || '48', 10);
    const maxHeight = parseInt(style.getPropertyValue('--input-max-height') || '200', 10);

    textarea.style.height = 'auto';
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
}

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

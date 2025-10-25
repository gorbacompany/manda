// chat-ui.js - Interfaz de usuario del chat

import { copyToClipboard } from './utils.js';
import { saveCurrentChat } from './chat-manager.js';

const CODE_COPY_ICON = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M14 3H6a2 2 0 0 0-2 2v12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M10 7h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
`;

const ACTION_ICON_COPY = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
`;

const ACTION_ICON_DELETE = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
    </svg>
`;

const ACTION_ICON_REGENERATE = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="1 4 1 10 7 10"></polyline>
        <polyline points="23 20 23 14 17 14"></polyline>
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"></path>
        <path d="M3.51 15A9 9 0 0 0 18.36 18.36L23 14"></path>
    </svg>
`;

const mathRenderQueue = [];
let resizeTimer = null;

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

// Función para añadir mensajes al chat
function createMessageActions({ onCopy, onDelete, onRegenerate }) {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    const buildActionButton = (icon, label, className, handler) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `msg-action ${className}`.trim();
        button.innerHTML = `${icon}<span class="sr-only">${label}</span>`;
        button.addEventListener('click', handler);
        return button;
    };

    const copyBtn = buildActionButton(ACTION_ICON_COPY, 'Copiar mensaje', 'copy', onCopy);
    actions.appendChild(copyBtn);

    const deleteBtn = buildActionButton(ACTION_ICON_DELETE, 'Eliminar mensaje', 'delete', onDelete);
    actions.appendChild(deleteBtn);

    if (typeof onRegenerate === 'function') {
        const regenerateBtn = buildActionButton(ACTION_ICON_REGENERATE, 'Regenerar respuesta', 'regenerate', onRegenerate);
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

    // This function is now in input-tray.js, so this call will fail.
    // It needs to be handled differently, perhaps by dispatching a custom event.
    // For now, this is broken.
    // handleSendMessage(); 
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

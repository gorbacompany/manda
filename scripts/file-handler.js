// file-handler.js - Manejo de archivos adjuntos

const INLINE_DATA_MAX_BYTES = 8 * 1024 * 1024; // 8 MB por adjunto para inlineData

// Variables para manejar adjuntos temporales
let tempFileContent = null;
let pendingAttachments = [];
let attachmentPreviewContainer = null;
let sendStatusElement = null;

async function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
                reject(new Error('Resultado de FileReader inesperado'));
                return;
            }
            const commaIndex = result.indexOf(',');
            resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };
        reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
    });
}

function shouldEmbedInlineData(file) {
    if (!file) return false;
    if (file.size > INLINE_DATA_MAX_BYTES) return false;
    const mime = file.type || '';
    if (!mime) return false;
    if (mime.startsWith('text/')) return false; // el contenido de texto ya se incluye directamente
    return true;
}

function ensureAttachmentContainers() {
    if (!attachmentPreviewContainer) {
        attachmentPreviewContainer = document.getElementById('attachmentPreview');
    }
    if (!sendStatusElement) {
        sendStatusElement = document.getElementById('sendStatus');
    }
}

function generateAttachmentId() {
    return `att-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let size = bytes / 1024;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }
    return `${size.toFixed(size < 10 ? 1 : 0)} ${units[index]}`;
}

function renderAttachmentPreview() {
    ensureAttachmentContainers();
    if (!attachmentPreviewContainer) return;

    attachmentPreviewContainer.innerHTML = '';

    if (!pendingAttachments.length) {
        attachmentPreviewContainer.classList.remove('has-items');
        return;
    }

    attachmentPreviewContainer.classList.add('has-items');

    pendingAttachments.forEach((attachment) => {
        const item = document.createElement('div');
        item.className = 'attachment-item';
        item.dataset.status = attachment.status;

        const infoWrapper = document.createElement('div');
        infoWrapper.className = 'attachment-info';

        const nameEl = document.createElement('span');
        nameEl.className = 'attachment-name';
        nameEl.textContent = attachment.name;

        const metaEl = document.createElement('span');
        metaEl.className = 'attachment-meta';
        const typeHint = attachment.type ? attachment.type.split('/')[0] : 'archivo';
        const sizeHint = formatFileSize(attachment.size);
        const statusHints = [];
        if (attachment.inlineData) {
            statusHints.push('datos inline');
        } else if (typeof attachment.content === 'string' && attachment.content.trim().length) {
            statusHints.push('texto');
        } else if (attachment.size > INLINE_DATA_MAX_BYTES) {
            statusHints.push('solo resumen ( >8MB )');
        } else {
            statusHints.push('solo resumen');
        }
        metaEl.textContent = [typeHint, sizeHint, ...statusHints].filter(Boolean).join(' · ');

        infoWrapper.appendChild(nameEl);
        infoWrapper.appendChild(metaEl);

        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'attachment-actions';

        const statusEl = document.createElement('span');
        statusEl.className = 'attachment-status';
        statusEl.textContent = attachment.statusLabel;
        statusEl.dataset.state = attachment.status;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'attachment-remove';
        removeBtn.dataset.attachmentId = attachment.id;
        removeBtn.textContent = '×';

        actionsWrapper.appendChild(statusEl);
        actionsWrapper.appendChild(removeBtn);

        item.appendChild(infoWrapper);
        item.appendChild(actionsWrapper);

        attachmentPreviewContainer.appendChild(item);
    });
}

function setSendStatus(message, state = '') {
    ensureAttachmentContainers();
    if (!sendStatusElement) return;
    if (!message) {
        sendStatusElement.textContent = '';
        sendStatusElement.dataset.state = '';
        sendStatusElement.classList.remove('visible');
        return;
    }
    sendStatusElement.textContent = message;
    sendStatusElement.dataset.state = state;
    sendStatusElement.classList.add('visible');
}

function dispatchAttachmentUpdate() {
    window.dispatchEvent(new CustomEvent('attachments:updated', {
        detail: { count: pendingAttachments.length }
    }));
}

function resetAttachments(options = {}) {
    const { keepStatus = false } = options;
    pendingAttachments = [];
    tempFileContent = null;
    renderAttachmentPreview();
    if (!keepStatus) {
        setSendStatus('');
    }
    dispatchAttachmentUpdate();
}

async function readTextIfPossible(file) {
    const lowerName = file.name.toLowerCase();
    const looksText = file.type.startsWith('text/') || /\.(txt|md|json|csv|log)$/i.test(lowerName);
    if (!looksText) return null;
    try {
        const content = await file.text();
        tempFileContent = content;
        return content;
    } catch (error) {
        console.warn('No se pudo leer el archivo como texto:', error);
        return null;
    }
}

async function createAttachmentFromFile(file) {
    const textContent = await readTextIfPossible(file);

    let inlineData = null;
    if (shouldEmbedInlineData(file)) {
        try {
            const base64Data = await readFileAsBase64(file);
            if (base64Data) {
                inlineData = {
                    mimeType: file.type || 'application/octet-stream',
                    data: base64Data
                };
            }
        } catch (error) {
            console.warn('No se pudo preparar inlineData para el archivo:', error);
        }
    }

    return {
        id: generateAttachmentId(),
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'pendiente',
        statusLabel: 'Pendiente',
        content: textContent,
        inlineData,
        inlineDataTooLarge: file.size > INLINE_DATA_MAX_BYTES
    };
}

function removeAttachmentById(id) {
    const index = pendingAttachments.findIndex((item) => item.id === id);
    if (index === -1) return;
    pendingAttachments.splice(index, 1);
    if (!pendingAttachments.some((item) => typeof item.content === 'string')) {
        tempFileContent = null;
    }
    renderAttachmentPreview();
    dispatchAttachmentUpdate();
}

// Función para cargar y leer el contenido de un archivo de texto
function loadFileContent(file) {
    return createAttachmentFromFile(file);
}

// Función para limpiar el contenido del archivo temporal
function clearTempFileContent() {
    resetAttachments();
}

// Función para obtener el contenido del archivo temporal
function getTempFileContent() {
    const textAttachment = pendingAttachments.find((item) => typeof item.content === 'string');
    return textAttachment?.content ?? tempFileContent;
}

// Función para configurar el manejador de archivos
export function setupFileHandler() {
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    ensureAttachmentContainers();

    attachBtn?.addEventListener('click', () => {
        fileInput?.click();
    });

    fileInput?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length) {
            try {
                for (const file of files) {
                    const attachment = await createAttachmentFromFile(file);
                    pendingAttachments.push(attachment);
                }
                renderAttachmentPreview();
                dispatchAttachmentUpdate();
            } catch (error) {
                console.error('Error al cargar archivos:', error);
            }
        }
        if (fileInput) {
            fileInput.value = '';
        }
    });

    attachmentPreviewContainer?.addEventListener('click', (event) => {
        const removeBtn = event.target.closest('.attachment-remove');
        if (!removeBtn) return;
        const { attachmentId } = removeBtn.dataset;
        removeAttachmentById(attachmentId);
    });
}

// Exportar funciones necesarias
export {
    getTempFileContent,
    clearTempFileContent
};

export function getPendingAttachments() {
    return pendingAttachments;
}

export function clearPendingAttachments() {
    resetAttachments({ keepStatus: true });
}

export function setAttachmentsStatus(status, label) {
    pendingAttachments = pendingAttachments.map((item) => ({
        ...item,
        status,
        statusLabel: label ?? (status === 'enviando' ? 'Enviando…' : status === 'listo' ? 'Listo' : 'Pendiente')
    }));
    renderAttachmentPreview();
}

export function showSendStatus(message, state = '') {
    setSendStatus(message, state);
}

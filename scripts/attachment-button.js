document.addEventListener('DOMContentLoaded', function() {
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');

    if (attachBtn && fileInput) {
        // Función para abrir el selector de archivos
        attachBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });

        // Manejar la selección de archivos
        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files.length > 0) {
                handleFileSelection(e.target.files);
            }
        });

        console.log('Attachment button functionality initialized');
    } else {
        console.error('Attachment button or file input not found');
    }
});

// Función para manejar la selección de archivos
async function handleFileSelection(files) {
    const attachmentPreview = document.getElementById('attachmentPreview');

    if (!attachmentPreview) {
        console.error('Attachment preview element not found');
        return;
    }

    // Limpiar preview anterior
    attachmentPreview.innerHTML = '';

    for (let file of files) {
        const fileItem = document.createElement('div');
        fileItem.className = 'attachment-item';
        fileItem.innerHTML = `
            <span class="attachment-name">${file.name}</span>
            <span class="attachment-size">(${formatFileSize(file.size)})</span>
            <button class="remove-attachment" onclick="removeAttachment('${file.name}')">×</button>
        `;

        attachmentPreview.appendChild(fileItem);
    }

    // Mostrar el preview
    attachmentPreview.style.display = 'block';

    // Emitir evento para que otros scripts sepan que hay attachments
    window.dispatchEvent(new CustomEvent('attachments:updated'));
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para remover attachments (global para que funcione desde onclick)
window.removeAttachment = function(fileName) {
    const fileInput = document.getElementById('fileInput');
    const attachmentPreview = document.getElementById('attachmentPreview');

    if (fileInput && attachmentPreview) {
        // Crear un nuevo array sin el archivo a remover
        const dt = new DataTransfer();
        const currentFiles = Array.from(fileInput.files);

        currentFiles.forEach(file => {
            if (file.name !== fileName) {
                dt.items.add(file);
            }
        });

        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));

        console.log(`Removed attachment: ${fileName}`);
    }
};

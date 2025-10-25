// ui-modals.js - Manejo de modales personalizados

// Función para mostrar un prompt personalizado
export function showCustomPrompt(title, defaultValue = '') {
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
        modal.classList.add('show');

        // Función para cerrar el modal
        const closePrompt = (result = null) => {
            modal.style.display = 'none';
            modal.classList.remove('show');
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
export function showCustomConfirm(message) {
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
        modal.classList.add('show');

        // Función para cerrar el modal
        const closePrompt = (result = false) => {
            modal.style.display = 'none';
            modal.classList.remove('show');
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

// Función para configurar los modales
export function setupModals() {
    // Inicializar modal de prompt como oculto
    const modal = document.getElementById('custom-prompt-modal');
    modal.style.display = 'none';
    modal.classList.remove('show');
}

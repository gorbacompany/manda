// utils.js - Funciones auxiliares

// Función para generar ID único
export function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Función para guardar chat en localStorage
export function saveChatToLocalStorage(id, messages = []) {
    const chatData = {
        id,
        timestamp: new Date().toISOString(),
        messages
    };
    localStorage.setItem(`chat_${id}`, JSON.stringify(chatData));
}

// Función para obtener lista de chats
export function getChatList() {
    const list = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('chat_')) {
            const chat = JSON.parse(localStorage.getItem(key));
            list.push(chat);
        }
    }
    return {
        chatList: list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    };
}

// Función para formatear fecha
export function formatDate(timestamp) {
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

// Función para copiar texto al portapapeles
export function copyToClipboard(text) {
    return navigator.clipboard.writeText(text).then(() => {
        showNotification('¡Copiado al portapapeles!', 'success');
        return true;
    }).catch(err => {
        console.error('Error al copiar al portapapeles:', err);
        showNotification('Error al copiar al portapapeles', 'error');
        return false;
    });
}

// Función simplificada para mostrar notificaciones
export function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--accent)' : '#ef4444'};
        color: white;
        padding: 10px 15px;
        border-radius: var(--radius);
        z-index: 10000;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: fadeInOut 2s ease-in-out;
    `;

    // Agregar animación CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-20px); }
            20%, 80% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
        document.body.removeChild(notification);
        document.head.removeChild(style);
    }, 2000);
}

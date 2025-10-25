const DEFAULT_BACKGROUND_URL = 'components/logo.svg';

let containerElement = null;
let backgroundElement = null;
let currentRatio = 1;
let resizeRafId = null;

export function initializeBackgroundManager(options = {}) {
    containerElement = document.getElementById('messages');
    if (!containerElement) {
        console.warn('No se encontró el contenedor de mensajes para aplicar el fondo.');
        return;
    }

    ensureBackgroundElement();
    setupControlListeners();

    const initialUrl = options.initialUrl || DEFAULT_BACKGROUND_URL;
    applyBackgroundImage(initialUrl);

    window.addEventListener('resize', handleResize, { passive: true });
}

export async function applyBackgroundImage(url) {
    if (!containerElement) {
        containerElement = document.getElementById('messages');
        if (!containerElement) return;
    }
    ensureBackgroundElement();

    const targetUrl = url?.trim() || DEFAULT_BACKGROUND_URL;
    try {
        const ratio = await loadImageRatio(targetUrl);
        currentRatio = ratio;
        backgroundElement.style.backgroundImage = `url('${targetUrl}')`;
        updateBackgroundSizing();
    } catch (error) {
        console.warn('No se pudo cargar la imagen especificada. Reponiendo a la predeterminada.', error);
        if (targetUrl !== DEFAULT_BACKGROUND_URL) {
            applyBackgroundImage(DEFAULT_BACKGROUND_URL);
        }
    }
}

export function setBackgroundOpacity(value) {
    if (!backgroundElement) return;
    const numericValue = Number(value);
    const clamped = Number.isFinite(numericValue) ? Math.min(Math.max(numericValue, 0), 1) : 1;
    backgroundElement.style.opacity = clamped;
}

function ensureBackgroundElement() {
    if (backgroundElement && backgroundElement.parentElement === containerElement) {
        return;
    }

    backgroundElement = document.createElement('div');
    backgroundElement.className = 'messages-background';
    backgroundElement.setAttribute('aria-hidden', 'true');
    backgroundElement.style.opacity = '0.25';
    backgroundElement.style.backgroundImage = `url('${DEFAULT_BACKGROUND_URL}')`;

    containerElement.insertBefore(backgroundElement, containerElement.firstChild || null);
}

function loadImageRatio(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const width = img.naturalWidth || 1;
            const height = img.naturalHeight || 1;
            resolve(width / height);
        };
        img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${url}`));
        img.src = url;
    });
}

function handleResize() {
    if (resizeRafId) {
        cancelAnimationFrame(resizeRafId);
    }
    resizeRafId = requestAnimationFrame(() => {
        resizeRafId = null;
        updateBackgroundSizing();
    });
}

function updateBackgroundSizing() {
    if (!containerElement || !backgroundElement) {
        return;
    }

    const rect = containerElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        return;
    }

    const containerRatio = rect.width / rect.height;
    let targetWidth;
    let targetHeight;

    if (containerRatio > currentRatio) {
        targetHeight = rect.height;
        targetWidth = targetHeight * currentRatio;
    } else {
        targetWidth = rect.width;
        targetHeight = targetWidth / currentRatio;
    }

    backgroundElement.style.width = `${targetWidth}px`;
    backgroundElement.style.height = `${targetHeight}px`;
}

function setupControlListeners() {
    const urlInput = document.getElementById('cfg-background-image');
    if (urlInput) {
        const applyFromInput = () => {
            applyBackgroundImage(urlInput.value);
        };
        urlInput.addEventListener('change', applyFromInput);
        urlInput.addEventListener('blur', applyFromInput);
        urlInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyFromInput();
            }
        });
    }

    const opacityInput = document.getElementById('cfg-background-opacity');
    if (opacityInput) {
        const handleOpacityChange = () => {
            setBackgroundOpacity(opacityInput.value);
        };
        opacityInput.addEventListener('input', handleOpacityChange);
        handleOpacityChange();
    }
}

// ai-config.js - Configuración de IA con soporte para modelos de Google

// Configuración de modelos de IA disponibles
export const AI_MODELS = {
    'gemini-2.5-pro': {
        name: 'Gemini 2.5 Pro',
        provider: 'Google DeepMind',
        type: 'advanced_reasoning',
        version: 'latest',
        description: 'Modelo de nivel profesional con razonamiento complejo, análisis multimodal y gran ventana de contexto. Ideal para programación avanzada, análisis de documentos extensos y comprensión profunda.',
        maxTokens: 1_000_000,
        maxOutputTokens: 65_536,
        rpm: 60,
        temperature: 0.7,
        topP: 0.8,
        topK: 64,
        capabilities: {
            modalities: ['text', 'image', 'audio', 'video'],
            reasoningMode: true,
            multimodal: true
        },
        pricing: {
            inputPerMillionTokensUsd: 2.5,
            outputPerMillionTokensUsd: 10,
            audioPerMillionTokensUsd: 5,
            videoPerMillionTokensUsd: 5
        },
        freeTier: {
            available: true,
            requestsPerDay: 500,
            notes: 'Cuota gratuita limitada para pruebas en AI Studio; tokens gratis variables según cuenta.'
        },
        apiReference: {
            aiStudio: 'https://aistudio.google.com/',
            resourcePath: 'models/gemini-2.5-pro',
            vertexPathExample: 'projects/{PROJECT_ID}/locations/{LOCATION}/models/gemini-2.5-pro',
            docsUrl: 'https://ai.google.dev/gemini-api/docs/models'
        },
        releaseDate: '2025-08',
        status: 'stable'
    },
    'gemini-2.5-flash-latest': {
        name: 'Gemini 2.5 Flash',
        provider: 'Google DeepMind',
        type: 'balanced_speed_quality',
        version: 'latest',
        description: 'Modelo equilibrado de alta velocidad y calidad razonable. Adecuado para producción con razonamiento medio y coste moderado.',
        maxTokens: 1_048_576,
        maxOutputTokens: 65_536,
        rpm: 120,
        temperature: 0.65,
        topP: 0.8,
        topK: 48,
        capabilities: {
            modalities: ['text', 'image', 'audio', 'video'],
            reasoningMode: false,
            multimodal: true
        },
        pricing: {
            inputPerMillionTokensUsd: 0.3,
            outputPerMillionTokensUsd: 2.5,
            audioPerMillionTokensUsd: 1,
            videoPerMillionTokensUsd: 1
        },
        freeTier: {
            available: true,
            requestsPerDay: 500,
            notes: 'Free Tier activo en AI Studio. Algunas operaciones marcadas como sin costo inicial.'
        },
        apiReference: {
            aiStudio: 'https://aistudio.google.com/',
            resourcePath: 'models/gemini-2.5-flash',
            vertexPathExample: 'projects/{PROJECT_ID}/locations/{LOCATION}/models/gemini-2.5-flash',
            docsUrl: 'https://ai.google.dev/gemini-api/docs/models'
        },
        releaseDate: '2025-09',
        status: 'stable'
    },
    'gemini-2.5-flash-lite-latest': {
        name: 'Gemini 2.5 Flash Lite',
        provider: 'Google DeepMind',
        type: 'low_cost_high_throughput',
        version: 'latest',
        description: 'Modelo de bajo costo y alta velocidad para tareas ligeras o de gran volumen. Ideal para inferencia en masa y aplicaciones con costo mínimo.',
        maxTokens: 1_048_576,
        maxOutputTokens: 65_536,
        rpm: 200,
        temperature: 0.6,
        topP: 0.85,
        topK: 32,
        capabilities: {
            modalities: ['text', 'image', 'audio', 'video', 'pdf'],
            reasoningMode: false,
            multimodal: true
        },
        pricing: {
            inputPerMillionTokensUsd: 0.1,
            outputPerMillionTokensUsd: 0.4,
            audioPerMillionTokensUsd: 0.3,
            videoPerMillionTokensUsd: 0.3
        },
        freeTier: {
            available: true,
            requestsPerDay: 500,
            notes: 'Incluye cuota gratuita total para texto, imagen y video en Free Tier de AI Studio.'
        },
        apiReference: {
            aiStudio: 'https://aistudio.google.com/',
            resourcePath: 'models/gemini-2.5-flash-lite',
            vertexPathExample: 'projects/{PROJECT_ID}/locations/{LOCATION}/models/gemini-2.5-flash-lite',
            docsUrl: 'https://ai.google.dev/gemini-api/docs/models'
        },
        releaseDate: '2025-09',
        status: 'stable'
    }
};

const STORAGE_KEYS = {
    activeModel: 'manda_active_model',
    topP: 'manda_top_p',
    topK: 'manda_top_k',
    systemPrompt: 'manda_system_prompt'
};

function clamp(value, min, max) {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
}

// System prompt por defecto (inicialmente vacío)
export const DEFAULT_SYSTEM_PROMPT = '';

// Configuración fija de IA (solo lectura para visualización)
let currentModelKey = localStorage.getItem(STORAGE_KEYS.activeModel) || 'gemini-2.5-flash-latest';
if (!AI_MODELS[currentModelKey]) {
    currentModelKey = 'gemini-2.5-flash-latest';
}

const CURRENT_AI_CONFIG = {
    modelKey: currentModelKey,
    model: AI_MODELS[currentModelKey],
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    temperature: AI_MODELS[currentModelKey].temperature,
    maxTokens: AI_MODELS[currentModelKey].maxTokens,
    maxOutputTokens: AI_MODELS[currentModelKey].maxOutputTokens,
    rpm: AI_MODELS[currentModelKey].rpm,
    topP: AI_MODELS[currentModelKey].topP,
    topK: AI_MODELS[currentModelKey].topK
};

applyStoredOverrides();

function applyStoredOverrides() {
    const storedTemperature = parseFloat(localStorage.getItem(STORAGE_KEYS.temperature) ?? '');
    if (!Number.isNaN(storedTemperature)) {
        CURRENT_AI_CONFIG.temperature = clamp(storedTemperature, 0, 1);
    }

    const storedTopP = parseFloat(localStorage.getItem(STORAGE_KEYS.topP) ?? '');
    if (!Number.isNaN(storedTopP)) {
        CURRENT_AI_CONFIG.topP = clamp(storedTopP, 0, 1);
    }

    const storedTopK = parseInt(localStorage.getItem(STORAGE_KEYS.topK) ?? '', 10);
    if (!Number.isNaN(storedTopK)) {
        CURRENT_AI_CONFIG.topK = clamp(storedTopK, 1, 128);
    }

    const storedPrompt = localStorage.getItem(STORAGE_KEYS.systemPrompt);
    if (typeof storedPrompt === 'string' && storedPrompt.length > 0) {
        CURRENT_AI_CONFIG.systemPrompt = storedPrompt;
    }
}

// Función para obtener la configuración actual (solo lectura)
export function getCurrentAIConfig() {
    return { ...CURRENT_AI_CONFIG };
}

// Función para obtener lista de modelos disponibles
export function getAvailableModels() {
    return Object.keys(AI_MODELS).map(key => ({
        key,
        ...AI_MODELS[key]
    }));
}

export function setActiveModel(modelKey) {
    if (!AI_MODELS[modelKey]) {
        throw new Error(`Modelo no soportado: ${modelKey}`);
    }
    CURRENT_AI_CONFIG.modelKey = modelKey;
    CURRENT_AI_CONFIG.model = AI_MODELS[modelKey];
    CURRENT_AI_CONFIG.maxTokens = AI_MODELS[modelKey].maxTokens;
    CURRENT_AI_CONFIG.maxOutputTokens = AI_MODELS[modelKey].maxOutputTokens;
    CURRENT_AI_CONFIG.rpm = AI_MODELS[modelKey].rpm;

    // Restaurar valores persistidos o usar defaults del modelo
    const hasStoredTemperature = localStorage.getItem(STORAGE_KEYS.temperature) !== null;
    CURRENT_AI_CONFIG.temperature = hasStoredTemperature ? CURRENT_AI_CONFIG.temperature : AI_MODELS[modelKey].temperature;

    const hasStoredTopP = localStorage.getItem(STORAGE_KEYS.topP) !== null;
    CURRENT_AI_CONFIG.topP = hasStoredTopP ? CURRENT_AI_CONFIG.topP : AI_MODELS[modelKey].topP;

    const hasStoredTopK = localStorage.getItem(STORAGE_KEYS.topK) !== null;
    CURRENT_AI_CONFIG.topK = hasStoredTopK ? CURRENT_AI_CONFIG.topK : AI_MODELS[modelKey].topK;

    localStorage.setItem(STORAGE_KEYS.activeModel, modelKey);
}

export function updateTemperature(value) {
    const numeric = clamp(parseFloat(value), 0, 1);
    if (Number.isNaN(numeric) || numeric === CURRENT_AI_CONFIG.temperature) {
        return;
    }
    CURRENT_AI_CONFIG.temperature = numeric;
    localStorage.setItem(STORAGE_KEYS.temperature, numeric.toFixed(2));
    dispatchParamsChanged({ temperature: numeric });
}

export function updateTopP(value) {
    const numeric = clamp(parseFloat(value), 0, 1);
    if (Number.isNaN(numeric) || numeric === CURRENT_AI_CONFIG.topP) {
        return;
    }
    CURRENT_AI_CONFIG.topP = numeric;
    localStorage.setItem(STORAGE_KEYS.topP, numeric.toFixed(2));
    dispatchParamsChanged({ topP: numeric });
}

export function updateTopK(value) {
    const numeric = clamp(parseInt(value, 10), 1, 128);
    if (Number.isNaN(numeric) || numeric === CURRENT_AI_CONFIG.topK) {
        return;
    }
    CURRENT_AI_CONFIG.topK = numeric;
    localStorage.setItem(STORAGE_KEYS.topK, numeric.toString());
    dispatchParamsChanged({ topK: numeric });
}

export function updateSystemPrompt(promptText) {
    if (typeof promptText !== 'string' || promptText === CURRENT_AI_CONFIG.systemPrompt) {
        return;
    }
    CURRENT_AI_CONFIG.systemPrompt = promptText;
    localStorage.setItem(STORAGE_KEYS.systemPrompt, promptText);
    dispatchParamsChanged({ systemPrompt: promptText });
}

function dispatchParamsChanged(detail = {}) {
    document.dispatchEvent(new CustomEvent('model:paramsChanged', { detail }));
}

// Función para enviar mensaje a la IA (simulada para demostración)
export async function sendToGemini(prompt) {
    // Esta es una función simulada para demostración
    // En producción se conectaría a la API real de Google Gemini

    const config = getCurrentAIConfig();

    // Simular respuesta de la API
    return new Promise((resolve) => {
        setTimeout(() => {
            const promptPreview = config.systemPrompt
                ? `System prompt aplicado: "${config.systemPrompt.substring(0, 50)}...". `
                : '';

            resolve({
                candidates: [{
                    content: {
                        parts: [{
                            text: `Respuesta simulada usando ${config.model.name}. ${promptPreview}Contexto de ${config.maxTokens} tokens soportado.`
                        }]
                    }
                }]
            });
        }, 1000);
    });
}

// Hacer la función disponible globalmente
window.sendToGemini = sendToGemini;

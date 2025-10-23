// ai-config.js - Configuración de IA con soporte para modelos de Google

// Configuración de modelos de IA disponibles
export const AI_MODELS = {
    'gemini-flash-latest': {
        name: 'Gemini Flash',
        provider: 'Google DeepMind',
        maxTokens: 250000,  // Límite TPM
        maxOutputTokens: 65536,
        rpm: 10,  // Requests per minute
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        description: 'Modelo equilibrado para experiencias agénticas rápidas con multimodalidad avanzada.'
    },
    'gemini-flash-lite-latest': {
        name: 'Gemini Flash Lite',
        provider: 'Google DeepMind',
        maxTokens: 250000,  // Límite TPM
        maxOutputTokens: 50000,
        rpm: 15,  // Requests per minute
        temperature: 0.65,
        topP: 0.8,
        topK: 40,
        description: 'Optimizado para costos bajos, respuestas concisas y traducción multimodal precisa.'
    }
};

const STORAGE_KEYS = {
    activeModel: 'manda_active_model',
    temperature: 'manda_temperature',
    topP: 'manda_top_p',
    topK: 'manda_top_k',
    systemPrompt: 'manda_system_prompt'
};

function clamp(value, min, max) {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
}

// System prompt por defecto
export const DEFAULT_SYSTEM_PROMPT = `Eres un asistente de programación avanzado llamado Cascade, especializado en desarrollo de software moderno.

Tus características principales:
- Eres un experto en múltiples lenguajes de programación y frameworks
- Proporcionas soluciones limpias, eficientes y bien documentadas
- Sigues las mejores prácticas de desarrollo
- Eres paciente y explicas conceptos complejos de manera clara
- Te mantienes actualizado con las últimas tendencias tecnológicas

Reglas de comportamiento:
1. Siempre proporciona código funcional y probado
2. Usa comentarios claros y documentación apropiada
3. Considera la seguridad, rendimiento y mantenibilidad
4. Sé proactivo en sugerir mejoras y optimizaciones
5. Mantén un tono profesional pero amigable

Formato de respuesta:
- Usa bloques de código con sintaxis apropiada
- Proporciona explicaciones claras antes y después del código
- Incluye ejemplos prácticos cuando sea útil
- Sé conciso pero completo en tus respuestas`;

// Configuración fija de IA (solo lectura para visualización)
let currentModelKey = localStorage.getItem(STORAGE_KEYS.activeModel) || 'gemini-flash-latest';
if (!AI_MODELS[currentModelKey]) {
    currentModelKey = 'gemini-flash-latest';
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
            resolve({
                candidates: [{
                    content: {
                        parts: [{
                            text: `Respuesta simulada usando ${config.model.name}. System prompt aplicado: "${config.systemPrompt.substring(0, 50)}...". Contexto de ${config.maxTokens} tokens soportado.`
                        }]
                    }
                }]
            });
        }, 1000);
    });
}

// Hacer la función disponible globalmente
window.sendToGemini = sendToGemini;

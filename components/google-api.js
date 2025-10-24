// google-api.js - Comunicación con Google Gemini API

import { getCurrentAIConfig } from './ai-config.js';

// Función para manejar configuraciones de contexto para la API de Gemini
export function createGenerationConfig(options = {}) {
    const currentConfig = getCurrentAIConfig();
    const defaultConfig = {
        maxOutputTokens: currentConfig.maxOutputTokens ?? 65_536,
        temperature: currentConfig.temperature ?? 0.7,
        topP: currentConfig.topP ?? 0.8,
        topK: currentConfig.topK ?? 40
    };

    // Fusionar opciones con configuración por defecto
    return { ...defaultConfig, ...options };
}

// Función para validar y ajustar el prompt basado en límites de entrada aproximados
export function validateAndAdjustPrompt(prompt, maxInputTokens = 250_000) {
    // Aproximación: ~4 caracteres por token (para texto en inglés/español)
    const estimatedTokens = Math.ceil(prompt.length / 4);

    if (estimatedTokens > maxInputTokens) {
        // Si excede, truncar el prompt para ajustarse aproximadamente al límite
        const maxLength = maxInputTokens * 4;
        const truncatedPrompt = prompt.substring(0, maxLength - 100) + '... [Prompt truncado para ajustarse al límite de tokens]';
        console.warn(`Prompt truncado de ${estimatedTokens} a aproximadamente ${maxInputTokens} tokens.`);
        return truncatedPrompt;
    }

    return prompt;
}

// Mapa para rastrear el último tiempo de envío por modelo
const lastSendTime = new Map();

// Función para enviar mensajes a la API de Google Gemini con configuración avanzada
export async function sendToGemini(prompt, configOptions = {}) {
    // Obtener la configuración actual incluyendo RPM
    const currentConfig = getCurrentAIConfig();

    // Validar y ajustar el prompt si es necesario según el modelo activo
    const adjustedPrompt = validateAndAdjustPrompt(prompt, currentConfig.maxTokens ?? 250_000);
    const modelRpm = currentConfig.rpm || 10;  // Default a 10 si no está definido
    const delayMs = Math.ceil(60000 / modelRpm);  // Delay en ms entre llamadas (60s / RPM)

    // Calcular delay necesario para respetar RPM
    const now = Date.now();
    const lastTime = lastSendTime.get(currentConfig.modelKey) || 0;
    const timeSinceLast = now - lastTime;
    if (timeSinceLast < delayMs) {
        const waitTime = delayMs - timeSinceLast;
        console.log(`Esperando ${waitTime}ms para respetar RPM de ${modelRpm} para ${currentConfig.modelKey}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Actualizar el último tiempo de envío
    lastSendTime.set(currentConfig.modelKey, Date.now());

    // Obtener las claves API del localStorage
    const apiKeys = JSON.parse(localStorage.getItem('google_api_keys') || '[]');
    if (apiKeys.length === 0) {
        throw new Error('No se han configurado claves API. Por favor, añade al menos una clave API.');
    }

    // Obtener el índice de la clave actual
    let currentIndex = parseInt(localStorage.getItem('current_api_key_index') || '0');
    if (currentIndex >= apiKeys.length) {
        currentIndex = 0;
    }

    // Usar el modelo actualmente seleccionado en la configuración
    const model = currentConfig.modelKey || 'gemini-2.5-flash-latest';

    // Preparar el cuerpo de la solicitud
    const body = {
        contents: [
            {
                parts: [
                    { text: adjustedPrompt }
                ]
            }
        ],
        generationConfig: createGenerationConfig(configOptions)
    };

    // Intentar con cada clave API hasta encontrar una que funcione, con rotación efectiva
    let attempts = 0;

    for (; attempts < apiKeys.length; attempts++) {
        const apiKey = apiKeys[currentIndex];

        // Construir endpoint con API key como parámetro de consulta (según documentación oficial)
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // Nota: NO incluir x-goog-api-key en headers según documentación oficial
                },
                body: JSON.stringify(body)
            });

            // Si la respuesta es exitosa, guardar el índice de la siguiente clave y devolver la respuesta
            if (response.ok) {
                const nextIndex = (currentIndex + 1) % apiKeys.length;
                localStorage.setItem('current_api_key_index', nextIndex.toString());
                return await response.json();
            }
            // Si es un error 429 (límite de tasa), rotar a la siguiente clave y continuar
            else if (response.status === 429) {
                currentIndex = (currentIndex + 1) % apiKeys.length;
                continue;
            }
            // Si es otro tipo de error, rotar y continuar
            else {
                const errorData = await response.json().catch(() => ({ error: { message: 'Error desconocido' } }));
                console.error(`Error con clave ${currentIndex + 1}: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
                currentIndex = (currentIndex + 1) % apiKeys.length;
                continue;
            }
        } catch (error) {
            // Rotar en caso de error de red u otros problemas
            currentIndex = (currentIndex + 1) % apiKeys.length;
            console.error(`Error de red con clave ${currentIndex + 1}:`, error);
        }
    }

    // Si todas las claves fallan o están rate-limited, retry con backoff
    const backoffDelay = Math.min(1000 * Math.pow(2, attempts || 1), 60000);  // Backoff exponencial, max 60s
    console.warn(`Todas las claves rate-limited o fallidas. Esperando ${backoffDelay}ms antes de retry.`);
    await new Promise(resolve => setTimeout(resolve, backoffDelay));

    // Retry el proceso completo
    return await sendToGemini(prompt, configOptions);
}

// floating-controls.js - Panel lateral con información del modelo y parámetros

import {
    getCurrentAIConfig,
    updateTemperature,
    updateTopP,
    updateTopK,
    updateSystemPrompt
} from './ai-config.js';

export function initializeInfoPanels() {
    renderModelInfo();
    renderParamsInfo();
}

export function renderModelInfo() {
    const container = document.getElementById('model-info-container');
    if (!container) return;

    const config = getCurrentAIConfig();
    const { model, modelKey } = config;

    container.innerHTML = `
        <div class="info-row">
            <span class="label">Nombre</span>
            <span class="value">${model.name}</span>
        </div>
        <div class="info-row">
            <span class="label">Proveedor</span>
            <span class="value">${model.provider}</span>
        </div>
        <div class="info-row">
            <span class="label">Alias activo</span>
            <span class="value">${modelKey}</span>
        </div>
        <div class="info-row">
            <span class="label">Contexto Máximo</span>
            <span class="value">${formatNumber(model.maxTokens)} tokens</span>
        </div>
        <div class="info-row">
            <span class="label">Salida Máxima</span>
            <span class="value">${formatNumber(model.maxOutputTokens)} tokens</span>
        </div>
        <div class="info-row">
            <span class="label">Modelo fijo</span>
            <span class="value">Sí</span>
        </div>
        <div class="info-section">
            <h4>Descripción</h4>
            <p class="model-description">${model.description || 'Modelo Gemini optimizado.'}</p>
        </div>
    `;
}

export function renderParamsInfo() {
    const container = document.getElementById('params-info-container');
    if (!container) return;

    const config = getCurrentAIConfig();

    container.innerHTML = `
        <div class="params-card-stack">
            <section class="params-card params-card--sliders">
                <header class="params-card__header">
                    <h3 class="params-card__title">Parámetros del modelo</h3>
                    <p class="params-card__subtitle">Ajusta la creatividad y diversidad de las respuestas.</p>
                </header>
                <div class="params-grid">
                    <div class="param-control">
                        <label for="temperature-slider">Temperatura</label>
                        <div class="slider-container">
                            <input id="temperature-slider" type="range" min="0" max="1" step="0.01" value="${config.temperature.toFixed(2)}">
                            <span class="slider-value" data-bind="temperature-value">${config.temperature.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="param-control">
                        <label for="top-p-slider">Top-P</label>
                        <div class="slider-container">
                            <input id="top-p-slider" type="range" min="0" max="1" step="0.01" value="${(config.topP ?? 0.8).toFixed(2)}">
                            <span class="slider-value" data-bind="top-p-value">${(config.topP ?? 0.8).toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="param-control">
                        <label for="top-k-slider">Top-K</label>
                        <div class="slider-container">
                            <input id="top-k-slider" type="range" min="1" max="128" step="1" value="${config.topK ?? 40}">
                            <span class="slider-value" data-bind="top-k-value">${config.topK ?? 40}</span>
                        </div>
                    </div>
                </div>
            </section>
            <section class="params-card params-card--prompt">
                <header class="params-card__header">
                    <h3 class="params-card__title">System Prompt</h3>
                    <p class="params-card__subtitle">Define instrucciones persistentes para el asistente.</p>
                </header>
                <textarea id="system-prompt-editor" class="system-prompt-editor" placeholder="Define el comportamiento del asistente...">${escapeHtml(config.systemPrompt)}</textarea>
                <div class="prompt-meta" id="system-prompt-meta"></div>
            </section>
        </div>
    `;

    bindParamControls(container);
}

function formatNumber(value) {
    if (typeof value !== 'number') return value;
    return value.toLocaleString('es-ES');
}

function escapeHtml(text) {
    return (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '\n');
}

function bindParamControls(container) {
    const tempSlider = container.querySelector('#temperature-slider');
    const topPSlider = container.querySelector('#top-p-slider');
    const topKSlider = container.querySelector('#top-k-slider');
    const promptEditor = container.querySelector('#system-prompt-editor');

    const tempValue = container.querySelector('[data-bind="temperature-value"]');
    const topPValue = container.querySelector('[data-bind="top-p-value"]');
    const topKValue = container.querySelector('[data-bind="top-k-value"]');
    const promptMeta = container.querySelector('#system-prompt-meta');

    const updatePromptMeta = () => {
        if (!promptEditor || !promptMeta) return;
        const text = promptEditor.value || '';
        const lines = text.split('\n').length;
        const chars = text.length;
        promptMeta.textContent = `${lines} línea${lines !== 1 ? 's' : ''} • ${chars} caractere${chars !== 1 ? 's' : ''}`;
    };

    if (tempSlider && tempValue) {
        const handleTemp = (event) => {
            const numeric = Number(event.target.value);
            tempValue.textContent = numeric.toFixed(2);
            updateTemperature(numeric);
        };
        tempSlider.addEventListener('input', (event) => {
            const numeric = Number(event.target.value);
            tempValue.textContent = numeric.toFixed(2);
        });
        tempSlider.addEventListener('change', handleTemp);
    }

    if (topPSlider && topPValue) {
        const handleTopP = (event) => {
            const numeric = Number(event.target.value);
            topPValue.textContent = numeric.toFixed(2);
            updateTopP(numeric);
        };
        topPSlider.addEventListener('input', (event) => {
            const numeric = Number(event.target.value);
            topPValue.textContent = numeric.toFixed(2);
        });
        topPSlider.addEventListener('change', handleTopP);
    }

    if (topKSlider && topKValue) {
        const handleTopK = (event) => {
            const numeric = Number(event.target.value);
            topKValue.textContent = numeric.toFixed(0);
            updateTopK(numeric);
        };
        topKSlider.addEventListener('input', (event) => {
            const numeric = Number(event.target.value);
            topKValue.textContent = numeric.toFixed(0);
        });
        topKSlider.addEventListener('change', handleTopK);
    }

    if (promptEditor) {
        const debouncedSave = debounce((value) => {
            updateSystemPrompt(value);
        }, 280);

        promptEditor.addEventListener('input', (event) => {
            updatePromptMeta();
            debouncedSave(event.target.value);
        });

        updatePromptMeta();
    }

    document.addEventListener('model:paramsChanged', (event) => {
        const detail = event.detail || {};
        if (typeof detail.temperature === 'number' && tempSlider && tempValue) {
            tempSlider.value = detail.temperature.toFixed(2);
            tempValue.textContent = detail.temperature.toFixed(2);
        }
        if (typeof detail.topP === 'number' && topPSlider && topPValue) {
            topPSlider.value = detail.topP.toFixed(2);
            topPValue.textContent = detail.topP.toFixed(2);
        }
        if (typeof detail.topK === 'number' && topKSlider && topKValue) {
            topKSlider.value = detail.topK.toFixed(0);
            topKValue.textContent = detail.topK.toFixed(0);
        }
        if (typeof detail.systemPrompt === 'string' && promptEditor) {
            promptEditor.value = detail.systemPrompt;
            updatePromptMeta();
        }
    }, { passive: true });
}

function debounce(callback, wait = 200) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback(...args), wait);
    };
}

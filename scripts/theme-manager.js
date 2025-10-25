// theme-manager.js - Gestiona el cambio dinámico de temas (oscuro/claro)

const THEME_STORAGE_KEY = 'manda_theme';
const THEME_OPTIONS = {
    dark: 'styles/theme-dark.css',
    light: 'styles/theme-light.css',
    'indigo-dark': 'styles/theme-indigo.css',
    'indigo-light': 'styles/theme-indigo-light.css'
};

let currentTheme = 'dark';

export function initializeThemeManager() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme && THEME_OPTIONS[savedTheme]) {
        currentTheme = savedTheme;
    } else {
        currentTheme = prefersDarkScheme() ? 'dark' : 'light';
    }

    applyTheme(currentTheme);
    setupThemeControls();
}

export function applyTheme(theme) {
    const stylesheet = document.getElementById('theme-stylesheet');
    if (!stylesheet || !THEME_OPTIONS[theme]) return;

    stylesheet.setAttribute('href', THEME_OPTIONS[theme]);
    currentTheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    document.documentElement.setAttribute('data-theme', theme);
    highlightSelectedOption(theme);
}

function setupThemeControls() {
    const radioControls = document.querySelectorAll('input[name="theme-mode"]');
    radioControls.forEach(control => {
        control.checked = control.value === currentTheme;
        control.addEventListener('change', (event) => {
            if (event.target.checked) {
                applyTheme(event.target.value);
            }
        });
    });

    const chips = document.querySelectorAll('.theme-chip[data-theme]');
    chips.forEach(chip => {
        chip.classList.toggle('active', chip.dataset.theme === currentTheme);
        chip.addEventListener('click', () => {
            const targetTheme = chip.dataset.theme;
            if (!targetTheme || targetTheme === currentTheme) return;
            applyTheme(targetTheme);
        });
    });

    highlightSelectedOption(currentTheme);
}

function highlightSelectedOption(theme) {
    const options = document.querySelectorAll('.theme-option');
    options.forEach(option => {
        const input = option.querySelector('input[name="theme-mode"]');
        if (!input) return;
        if (input.value === theme) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });

    document.querySelectorAll('.theme-chip[data-theme]').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.theme === theme);
    });
}

function prefersDarkScheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Permite alternar tema desde consola si es necesario
window.applyTheme = applyTheme;

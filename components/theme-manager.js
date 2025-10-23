// theme-manager.js - Gestiona el cambio dinámico de temas (oscuro/claro)

const THEME_STORAGE_KEY = 'manda_theme';
const THEME_OPTIONS = {
    dark: 'components/theme-dark.css',
    light: 'components/theme-light.css'
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
    const controls = document.querySelectorAll('input[name="theme-mode"]');
    if (!controls.length) return;

    controls.forEach(control => {
        control.checked = control.value === currentTheme;
        control.addEventListener('change', (event) => {
            if (event.target.checked) {
                applyTheme(event.target.value);
            }
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
}

function prefersDarkScheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Permite alternar tema desde consola si es necesario
window.applyTheme = applyTheme;

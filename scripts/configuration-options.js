// configuration-options.js - Clases de configuración disponibles para la app Manda

/**
 * Configuración del fondo del área de mensajes.
 */
export class MessageBackgroundConfig {
    constructor({ imageUrl = '', opacity = 1 } = {}) {
        this.imageUrl = imageUrl;
        this.opacity = opacity;
    }

    apply() {
        // Implementación pendiente
    }
}

/**
 * Configuración de temas cromáticos predefinidos.
 */
export class ThemePaletteConfig {
    constructor({ theme = 'white' } = {}) {
        this.theme = theme;
    }

    apply() {}
}

/**
 * Configuración para la familia tipográfica del chat.
 */
export class FontFamilyConfig {
    constructor({ fontFamily = 'system' } = {}) {
        this.fontFamily = fontFamily;
    }

    apply() {}
}

/**
 * Configuración para el tamaño de fuente en mensajes.
 */
export class FontSizeConfig {
    constructor({ size = 16 } = {}) {
        this.size = size;
    }

    apply() {}
}

/**
 * Configuración de estilo de burbuja de mensajes.
 */
export class MessageBubbleStyleConfig {
    constructor({ style = 'rounded' } = {}) {
        this.style = style;
    }

    apply() {}
}

/**
 * Configuración de densidad del chat (espaciado vertical).
 */
export class ChatDensityConfig {
    constructor({ density = 'comfortable' } = {}) {
        this.density = density;
    }

    apply() {}
}

/**
 * Configuración de formato de marcas de tiempo.
 */
export class TimestampFormatConfig {
    constructor({ format = '24h' } = {}) {
        this.format = format;
    }

    apply() {}
}

/**
 * Configuración de sonido de notificaciones.
 */
export class NotificationSoundConfig {
    constructor({ enabled = true, soundId = 'default' } = {}) {
        this.enabled = enabled;
        this.soundId = soundId;
    }

    apply() {}
}

/**
 * Configuración de guardado automático de chats.
 */
export class AutoSaveConfig {
    constructor({ enabled = true, intervalMinutes = 5 } = {}) {
        this.enabled = enabled;
        this.intervalMinutes = intervalMinutes;
    }

    apply() {}
}

/**
 * Configuración de idioma preferido de la interfaz.
 */
export class LanguagePreferenceConfig {
    constructor({ locale = 'es-MX' } = {}) {
        this.locale = locale;
    }

    apply() {}
}

// Exponer clases para posibles pruebas desde consola.
window.MandaConfigurations = {
    MessageBackgroundConfig,
    ThemePaletteConfig,
    FontFamilyConfig,
    FontSizeConfig,
    MessageBubbleStyleConfig,
    ChatDensityConfig,
    TimestampFormatConfig,
    NotificationSoundConfig,
    AutoSaveConfig,
    LanguagePreferenceConfig
};

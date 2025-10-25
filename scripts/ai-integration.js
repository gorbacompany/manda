import { buscarWikipedia } from './wikipedia-api.js';
import { almacenarConocimiento, recuperarConocimiento, buscarEnBaseConocimiento } from './knowledge-manager.js';

const PALABRAS_CLAVE = ['qué es', 'quién es', 'historia de', 'definición de', 'significado de'];

/**
 * Decide si una consulta necesita búsqueda externa
 * @param {string} consulta - Consulta del usuario
 * @returns {boolean}
 */
export function necesitaBusqueda(consulta = '') {
    const texto = consulta.toLowerCase();
    return PALABRAS_CLAVE.some((clave) => texto.includes(clave));
}

/**
 * Obtiene conocimiento desde Wikipedia o caché interno
 * @param {string} termino - Término a consultar
 * @param {number} limite - Número máximo de resultados
 * @returns {Promise<Array>}
 */
export async function obtenerConocimiento(termino, limite = 3) {
    if (!termino) return [];

    const existente = recuperarConocimiento(termino);
    if (existente?.resultados?.length) {
        return existente.resultados;
    }

    const acumulado = buscarEnBaseConocimiento(termino);
    if (acumulado.length) {
        return acumulado;
    }

    const resultados = await buscarWikipedia(termino, limite);
    if (resultados.length) {
        almacenarConocimiento(termino, resultados);
    }
    return resultados;
}

/**
 * Ejecuta búsquedas en cascada y acumula conocimiento
 * @param {string[]} terminos - Lista de términos a buscar
 * @param {number} limite - Número máximo de resultados por término
 * @returns {Promise<Array>}
 */
export async function busquedaCascada(terminos = [], limite = 3) {
    const conocimiento = [];

    for (const termino of terminos) {
        try {
            const resultados = await obtenerConocimiento(termino, limite);
            if (resultados?.length) {
                conocimiento.push(...resultados);
            }
        } catch (error) {
            console.error(`Error en la búsqueda de "${termino}":`, error);
        }
    }

    return conocimiento;
}

/**
 * Formatea el conocimiento acumulado para ser inyectado en prompts
 * @param {Array} conocimiento - Resultados de búsqueda acumulados
 * @returns {string}
 */
export function formatearConocimiento(conocimiento = []) {
    if (!Array.isArray(conocimiento) || conocimiento.length === 0) {
        return '';
    }

    return conocimiento.map((item, index) => {
        const titulo = item.titulo || 'Título desconocido';
        const extracto = item.extracto || 'Sin extracto disponible';
        const fuente = item.url || 'Fuente no disponible';
        return `[Fuente ${index + 1}] "${titulo}": ${extracto}\nFuente: ${fuente}`;
    }).join('\n\n');
}

/**
 * Inserta la sección de conocimiento verificado en la respuesta de la IA
 * @param {string} respuestaIA - Texto original de la IA
 * @param {string} conocimientoFormateado - Texto con las fuentes formateadas
 * @returns {string}
 */
export function integrarConocimiento(respuestaIA, conocimientoFormateado) {
    if (!conocimientoFormateado) return respuestaIA;
    return `${respuestaIA}\n\n**Información verificada:**\n${conocimientoFormateado}`;
}

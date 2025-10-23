const wikipediaCache = new Map();

/**
 * Realiza búsquedas en Wikipedia usando MediaWiki API con caché en memoria
 * @param {string} termino - Término de búsqueda
 * @param {number} [limite=5] - Número máximo de resultados
 * @returns {Promise<Array>} - Array de resultados
 */
export async function buscarWikipedia(termino, limite = 5) {
    if (!termino) return [];

    const terminoNormalizado = termino.trim().toLowerCase();
    if (wikipediaCache.has(terminoNormalizado)) {
        return wikipediaCache.get(terminoNormalizado);
    }

    const terminoCodificado = encodeURIComponent(termino);
    const API_URL = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${terminoCodificado}&format=json&origin=*&srlimit=${limite}`;

    try {
        const respuesta = await fetch(API_URL);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        const resultados = datos.query?.search.map(articulo => ({
            id: articulo.pageid,
            titulo: articulo.title,
            extracto: limpiarHTML(articulo.snippet),
            url: `https://es.wikipedia.org/wiki/${encodeURIComponent(articulo.title)}`,
            timestamp: new Date().toISOString()
        })) || [];

        wikipediaCache.set(terminoNormalizado, resultados);
        return resultados;

    } catch (error) {
        console.error("Error en búsqueda de Wikipedia:", error);
        throw error;
    }
}

/**
 * Elimina etiquetas HTML del snippet
 * @param {string} html - Texto con HTML
 * @returns {string} - Texto limpio
 */
function limpiarHTML(html) {
    return html.replace(/<[^>]*>?/gm, '')
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&');
}

/**
 * Formatea resultados para uso en IA
 * @param {Array} resultados - Resultados de búsqueda
 * @returns {string} - Texto formateado
 */
export function formatearParaIA(resultados) {
    return resultados.map((res, index) => 
        `[${index + 1}] "${res.titulo}": ${res.extracto}\nFuente: ${res.url}`
    ).join('\n\n');
}

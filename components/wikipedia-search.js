/**
 * Realiza una búsqueda en Wikipedia en español.
 * @param {string} term - El término a buscar.
 * @returns {Promise<Array>} - Array de resultados.
 */
export async function buscarWikipedia(term) {
    const terminoCodificado = encodeURIComponent(term);
    const API_URL = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${terminoCodificado}&format=json&origin=*`;

    try {
        const respuesta = await fetch(API_URL);
        const datos = await respuesta.json();

        if (datos.query && datos.query.search) {
            return datos.query.search.map(articulo => ({
                title: articulo.title,
                snippet: articulo.snippet.replace(/<[^>]*>?/gm, ''), // Limpiar HTML
                url: `https://es.wikipedia.org/wiki/${encodeURIComponent(articulo.title)}`
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error("Error al conectar con la API de Wikipedia:", error);
        return [];
    }
}

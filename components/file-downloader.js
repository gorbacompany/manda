// file-downloader.js - Módulo para gestionar la descarga de archivos en el navegador

/**
 * Inicia la descarga de un archivo en el navegador.
 *
 * @param {string} fileName - El nombre que tendrá el archivo descargado.
 * @param {string} content - El contenido del archivo.
 * @param {string} mimeType - El tipo MIME del archivo (ej. 'text/plain', 'text/markdown;charset=utf-t').
 * @returns {boolean} - Devuelve `true` si la descarga se inició correctamente, `false` en caso de error.
 */
export function downloadFile(fileName, content, mimeType) {
    try {
        // Crear un Blob con el contenido y el tipo MIME
        const blob = new Blob([content], { type: mimeType });

        // Crear una URL temporal para el Blob
        const url = URL.createObjectURL(blob);

        // Crear un enlace <a> temporal para iniciar la descarga
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;

        // Añadir el enlace al DOM, simular un clic y luego eliminarlo
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Liberar la URL del objeto después de un tiempo para asegurar que la descarga comience
        setTimeout(() => URL.revokeObjectURL(url), 1500);

        return true; // Indicar que la operación fue exitosa
    } catch (error) {
        console.error('Error en la descarga del archivo:', error);
        return false; // Indicar que hubo un fallo
    }
}

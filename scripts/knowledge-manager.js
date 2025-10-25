const knowledgeBase = new Map();

export function almacenarConocimiento(consulta, resultados) {
    knowledgeBase.set(consulta, {
        timestamp: new Date().toISOString(),
        resultados: Array.isArray(resultados) ? resultados.slice(0, 3) : []
    });
}

export function recuperarConocimiento(consulta) {
    return knowledgeBase.get(consulta) || null;
}

export function buscarEnBaseConocimiento(termino) {
    const acumulado = [];

    for (const [consulta, data] of knowledgeBase.entries()) {
        if (consulta.toLowerCase().includes(termino.toLowerCase())) {
            acumulado.push(...(data.resultados || []));
        }
    }

    return acumulado.slice(0, 5);
}

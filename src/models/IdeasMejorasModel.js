const { pool } = require('../config/database');
const ScoreIdeasModel = require('./ScoreIdeasModel');

class IdeasMejorasModel {
    /**
     * Obtener todas las ideas/mejoras con sus scores.
     * El score mostrado se calcula con la misma fórmula que la calculadora (score_calculado).
     */
    static async obtenerTodas(filtros = {}) {
        try {
            let query = `
                SELECT 
                    i.*,
                    s.origen, s.facturacion, s.facturacion_potencial,
                    s.impacto_cliente, s.esfuerzo, s.incertidumbre, s.riesgo,
                    s.peso_origen, s.peso_facturacion, s.peso_facturacion_potencial,
                    s.peso_impacto_cliente, s.peso_esfuerzo, s.peso_incertidumbre, s.peso_riesgo,
                    s.score_calculado,
                    COALESCE(s.score_calculado, 0) AS score_total
                FROM ideas_mejoras i
                LEFT JOIN score_ideas s ON i.id = s.idea_id
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

            if (filtros.busqueda) {
                query += ` AND (
                    i.titulo ILIKE $${paramCount} OR 
                    i.descripcion ILIKE $${paramCount} OR 
                    i.seccion ILIKE $${paramCount}
                )`;
                params.push(`%${filtros.busqueda}%`);
                paramCount++;
            }

            if (filtros.seccion) {
                query += ` AND i.seccion = $${paramCount}`;
                params.push(filtros.seccion);
                paramCount++;
            }
            
            if (filtros.secciones && filtros.secciones.length > 0) {
                query += ` AND i.seccion = ANY($${paramCount})`;
                params.push(filtros.secciones);
                paramCount++;
            }
            
            const ordenValido = ['titulo', 'score_total', 'fecha_creacion', 'created_at', 'seccion'];
            const orden = ordenValido.includes(filtros.orden) ? filtros.orden : 'score_total';
            const direccion = filtros.direccion === 'asc' ? 'ASC' : 'DESC';
            const ordenColumn = orden === 'score_total' ? orden : `i.${orden}`;
            query += ` ORDER BY ${ordenColumn} ${direccion} NULLS LAST`;

            const result = await pool.query(query, params);
            const rows = result.rows;

            // Calcular score con la misma fórmula que la calculadora para que lista y detalle muestren el mismo valor
            for (const row of rows) {
                const tieneScore = row.facturacion != null || row.facturacion_potencial != null ||
                    row.impacto_cliente != null || row.esfuerzo != null || row.incertidumbre != null || row.riesgo != null;
                if (tieneScore) {
                    const criterios = {
                        facturacion: row.facturacion ?? 0,
                        facturacion_potencial: row.facturacion_potencial ?? 0,
                        impacto_cliente: row.impacto_cliente ?? 0,
                        esfuerzo: row.esfuerzo ?? 0,
                        incertidumbre: row.incertidumbre ?? 0,
                        riesgo: row.riesgo ?? 0
                    };
                    const pesos = {
                        peso_facturacion: row.peso_facturacion ?? 40,
                        peso_facturacion_potencial: row.peso_facturacion_potencial ?? 20,
                        peso_impacto_cliente: row.peso_impacto_cliente ?? 40,
                        peso_esfuerzo: row.peso_esfuerzo ?? 40,
                        peso_incertidumbre: row.peso_incertidumbre ?? 30,
                        peso_riesgo: row.peso_riesgo ?? 30
                    };
                    const scoreCalculado = ScoreIdeasModel.calcularScore(criterios, pesos);
                    row.score_calculado = scoreCalculado;
                    row.score_total = scoreCalculado;
                }
            }

            // Reordenar por score_total si ese era el criterio (ya tenemos los valores calculados)
            if (orden === 'score_total') {
                rows.sort((a, b) => {
                    const sa = parseFloat(a.score_total) || 0;
                    const sb = parseFloat(b.score_total) || 0;
                    return direccion === 'asc' ? sa - sb : sb - sa;
                });
            }

            return rows;
        } catch (error) {
            console.error('Error al obtener ideas/mejoras:', error);
            throw error;
        }
    }

    /**
     * Obtener idea/mejora por ID con score
     * @param {number} id - ID de la idea
     */
    static async obtenerPorId(id) {
        try {
            const query = `
                SELECT 
                    i.*,
                    s.origen, s.facturacion, s.facturacion_potencial,
                    s.impacto_cliente, s.esfuerzo, s.incertidumbre, s.riesgo,
                    s.score_calculado,
                    s.peso_origen, s.peso_facturacion, 
                    s.peso_facturacion_potencial, s.peso_impacto_cliente,
                    s.peso_esfuerzo, s.peso_incertidumbre, s.peso_riesgo
                FROM ideas_mejoras i
                LEFT JOIN score_ideas s ON i.id = s.idea_id
                WHERE i.id = $1
            `;
            const result = await pool.query(query, [id]);
            const row = result.rows[0] || null;
            if (row) {
                const tieneScore = row.facturacion != null || row.facturacion_potencial != null ||
                    row.impacto_cliente != null || row.esfuerzo != null || row.incertidumbre != null || row.riesgo != null;
                if (tieneScore) {
                    const criterios = {
                        facturacion: row.facturacion ?? 0,
                        facturacion_potencial: row.facturacion_potencial ?? 0,
                        impacto_cliente: row.impacto_cliente ?? 0,
                        esfuerzo: row.esfuerzo ?? 0,
                        incertidumbre: row.incertidumbre ?? 0,
                        riesgo: row.riesgo ?? 0
                    };
                    const pesos = {
                        peso_facturacion: row.peso_facturacion ?? 40,
                        peso_facturacion_potencial: row.peso_facturacion_potencial ?? 20,
                        peso_impacto_cliente: row.peso_impacto_cliente ?? 40,
                        peso_esfuerzo: row.peso_esfuerzo ?? 40,
                        peso_incertidumbre: row.peso_incertidumbre ?? 30,
                        peso_riesgo: row.peso_riesgo ?? 30
                    };
                    row.score_calculado = ScoreIdeasModel.calcularScore(criterios, pesos);
                }
            }
            return row;
        } catch (error) {
            console.error('Error al obtener idea/mejora:', error);
            throw error;
        }
    }

    /**
     * Crear nueva idea/mejora
     */
    static async crear(datos) {
        try {
            const query = `
                INSERT INTO ideas_mejoras (titulo, descripcion, seccion, fecha_creacion)
                VALUES ($1, $2, $3, COALESCE($4, CURRENT_TIMESTAMP))
                RETURNING *
            `;
            const values = [
                datos.titulo,
                datos.descripcion || null,
                datos.seccion || null,
                datos.fecha_creacion || null
            ];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error al crear idea/mejora:', error);
            throw error;
        }
    }

    /**
     * Actualizar idea/mejora
     * @param {number} id - ID de la idea
     */
    static async actualizar(id, datos) {
        try {
            const query = `
                UPDATE ideas_mejoras
                SET titulo = COALESCE($1, titulo),
                    descripcion = $2,
                    seccion = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `;
            const values = [
                datos.titulo || null,
                datos.descripcion || null,
                datos.seccion || null,
                id
            ];
            const result = await pool.query(query, values);
            
            if (!result.rows[0]) {
                return null;
            }
            
            return await this.obtenerPorId(id);
        } catch (error) {
            console.error('Error al actualizar idea/mejora:', error);
            throw error;
        }
    }

    /**
     * Eliminar idea/mejora
     * @param {number} id - ID de la idea
     */
    static async eliminar(id) {
        try {
            const query = 'DELETE FROM ideas_mejoras WHERE id = $1 RETURNING *';
            const result = await pool.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar idea/mejora:', error);
            throw error;
        }
    }

    /**
     * Obtener secciones únicas
     */
    static async obtenerSecciones() {
        try {
            const query = `
                SELECT DISTINCT seccion 
                FROM ideas_mejoras 
                WHERE seccion IS NOT NULL 
                ORDER BY seccion
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.seccion);
        } catch (error) {
            console.error('Error al obtener secciones de ideas/mejoras:', error);
            throw error;
        }
    }
    
    /**
     * Obtener estadísticas
     */
    static async obtenerEstadisticas() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_ideas,
                    AVG(COALESCE(s.score_calculado, 0)) as score_promedio,
                    COUNT(DISTINCT i.seccion) as total_secciones
                FROM ideas_mejoras i
                LEFT JOIN score_ideas s ON i.id = s.idea_id
            `;
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener estadísticas de ideas/mejoras:', error);
            throw error;
        }
    }

    /**
     * Buscar sugerencias para autocompletado
     */
    static async buscarSugerencias(query, limite = 5) {
        try {
            const sql = `
                SELECT id, titulo, seccion
                FROM ideas_mejoras
                WHERE titulo ILIKE $1 OR descripcion ILIKE $1
                ORDER BY 
                    CASE WHEN titulo ILIKE $2 THEN 0 ELSE 1 END,
                    titulo
                LIMIT $3
            `;
            const result = await pool.query(sql, [`%${query}%`, `${query}%`, limite]);
            return result.rows;
        } catch (error) {
            console.error('Error al buscar sugerencias:', error);
            throw error;
        }
    }
}

module.exports = IdeasMejorasModel;



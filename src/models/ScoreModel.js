const { pool } = require('../config/database');

class ScoreModel {
    /**
     * Obtener score de una funcionalidad
     */
    static async obtenerPorFuncionalidad(funcionalidadId) {
        try {
            const query = 'SELECT * FROM score WHERE funcionalidad_id = $1';
            const result = await pool.query(query, [funcionalidadId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener score:', error);
            throw error;
        }
    }

    /**
     * Actualizar score de una funcionalidad
     */
    static async actualizar(funcionalidadId, criterios) {
        try {
            const query = `
                UPDATE score
                SET origen = $1,
                    facturacion = $2,
                    urgencia = $3,
                    facturacion_potencial = $4,
                    impacto_cliente = $5,
                    esfuerzo = $6,
                    incertidumbre = $7,
                    riesgo = $8,
                    updated_at = CURRENT_TIMESTAMP
                WHERE funcionalidad_id = $9
                RETURNING *
            `;
            const values = [
                criterios.origen || 0,
                criterios.facturacion || 0,
                criterios.urgencia || 0,
                criterios.facturacion_potencial || 0,
                criterios.impacto_cliente || 0,
                criterios.esfuerzo || 0,
                criterios.incertidumbre || 0,
                criterios.riesgo || 0,
                funcionalidadId
            ];
            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al actualizar score:', error);
            throw error;
        }
    }

    /**
     * Actualizar pesos de los criterios
     */
    static async actualizarPesos(funcionalidadId, pesos) {
        try {
            const query = `
                UPDATE score
                SET peso_origen = $1,
                    peso_facturacion = $2,
                    peso_urgencia = $3,
                    peso_facturacion_potencial = $4,
                    peso_impacto_cliente = $5,
                    peso_esfuerzo = $6,
                    peso_incertidumbre = $7,
                    peso_riesgo = $8,
                    updated_at = CURRENT_TIMESTAMP
                WHERE funcionalidad_id = $9
                RETURNING *
            `;
            const values = [
                pesos.peso_origen || 40.00,
                pesos.peso_facturacion || 20.00,
                pesos.peso_urgencia || 20.00,
                pesos.peso_facturacion_potencial || 20.00,
                pesos.peso_impacto_cliente || 33.33,
                pesos.peso_esfuerzo || 33.33,
                pesos.peso_incertidumbre || 33.33,
                pesos.peso_riesgo || 33.33,
                funcionalidadId
            ];
            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al actualizar pesos:', error);
            throw error;
        }
    }

    /**
     * Calcular score manualmente (útil para previsualizaciones)
     */
    static calcularScore(criterios, pesos) {
        const score = (
            (criterios.origen * pesos.peso_origen / 100) +
            (criterios.facturacion * pesos.peso_facturacion / 100) +
            (criterios.urgencia * pesos.peso_urgencia / 100) +
            (criterios.facturacion_potencial * pesos.peso_facturacion_potencial / 100) +
            (criterios.impacto_cliente * pesos.peso_impacto_cliente / 100) +
            (criterios.esfuerzo * pesos.peso_esfuerzo / 100) +
            (criterios.incertidumbre * pesos.peso_incertidumbre / 100) +
            (criterios.riesgo * pesos.peso_riesgo / 100)
        );
        return parseFloat(score.toFixed(2));
    }

    /**
     * Obtener ranking de funcionalidades por score
     */
    static async obtenerRanking() {
        try {
            const query = `
                SELECT 
                    f.id,
                    f.titulo,
                    f.seccion,
                    s.score_calculado,
                    s.origen,
                    s.facturacion,
                    s.urgencia,
                    s.facturacion_potencial,
                    s.impacto_cliente,
                    s.esfuerzo,
                    s.incertidumbre,
                    s.riesgo
                FROM funcionalidades f
                LEFT JOIN score s ON f.id = s.funcionalidad_id
                ORDER BY s.score_calculado DESC NULLS LAST
            `;
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener ranking:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de scores
     */
    static async obtenerEstadisticas() {
        try {
            const query = `
                SELECT 
                    AVG(score_calculado) as promedio,
                    MAX(score_calculado) as maximo,
                    MIN(score_calculado) as minimo,
                    AVG(origen) as promedio_origen,
                    AVG(facturacion) as promedio_facturacion,
                    AVG(urgencia) as promedio_urgencia,
                    AVG(facturacion_potencial) as promedio_facturacion_potencial,
                    AVG(impacto_cliente) as promedio_impacto_cliente,
                    AVG(esfuerzo) as promedio_esfuerzo,
                    AVG(incertidumbre) as promedio_incertidumbre,
                    AVG(riesgo) as promedio_riesgo
                FROM score
            `;
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener estadísticas de scores:', error);
            throw error;
        }
    }
}

module.exports = ScoreModel;


const { pool } = require('../config/database');

class ScoreBacklogModel {
    /**
     * Obtener score de un proyecto
     * @param {number} funcionalidad_id - ID del proyecto (redmine_id)
     */
    static async obtenerPorFuncionalidad(funcionalidad_id) {
        try {
            const query = 'SELECT * FROM score_backlog WHERE funcionalidad_id = $1';
            const result = await pool.query(query, [funcionalidad_id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener score:', error);
            throw error;
        }
    }

    /**
     * Crear o actualizar score de un proyecto
     * @param {number} funcionalidad_id - ID del proyecto (redmine_id)
     * @param {Object} criterios - Criterios de evaluación
     */
    static async guardar(funcionalidad_id, criterios) {
        try {
            const query = `
                INSERT INTO score_backlog (
                    funcionalidad_id,
                    origen, facturacion, facturacion_potencial,
                    impacto_cliente, esfuerzo, incertidumbre, riesgo,
                    peso_origen, peso_facturacion, peso_facturacion_potencial,
                    peso_impacto_cliente, peso_esfuerzo, peso_incertidumbre, peso_riesgo
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (funcionalidad_id) 
                DO UPDATE SET
                    origen = EXCLUDED.origen,
                    facturacion = EXCLUDED.facturacion,
                    facturacion_potencial = EXCLUDED.facturacion_potencial,
                    impacto_cliente = EXCLUDED.impacto_cliente,
                    esfuerzo = EXCLUDED.esfuerzo,
                    incertidumbre = EXCLUDED.incertidumbre,
                    riesgo = EXCLUDED.riesgo,
                    peso_origen = EXCLUDED.peso_origen,
                    peso_facturacion = EXCLUDED.peso_facturacion,
                    peso_facturacion_potencial = EXCLUDED.peso_facturacion_potencial,
                    peso_impacto_cliente = EXCLUDED.peso_impacto_cliente,
                    peso_esfuerzo = EXCLUDED.peso_esfuerzo,
                    peso_incertidumbre = EXCLUDED.peso_incertidumbre,
                    peso_riesgo = EXCLUDED.peso_riesgo,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const values = [
                funcionalidad_id,
                criterios.origen || 0,
                criterios.facturacion || 0,
                criterios.facturacion_potencial || 0,
                criterios.impacto_cliente || 0,
                criterios.esfuerzo || 0,
                criterios.incertidumbre || 0,
                criterios.riesgo || 0,
                criterios.peso_origen || 1.00,
                criterios.peso_facturacion || 1.00,
                criterios.peso_facturacion_potencial || 1.00,
                criterios.peso_impacto_cliente || 1.00,
                criterios.peso_esfuerzo || 1.00,
                criterios.peso_incertidumbre || 1.00,
                criterios.peso_riesgo || 1.00
            ];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error al guardar score:', error);
            throw error;
        }
    }

    /**
     * Eliminar score de un proyecto
     * @param {number} funcionalidad_id - ID del proyecto (redmine_id)
     */
    static async eliminar(funcionalidad_id) {
        try {
            const query = 'DELETE FROM score_backlog WHERE funcionalidad_id = $1 RETURNING *';
            const result = await pool.query(query, [funcionalidad_id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar score:', error);
            throw error;
        }
    }

    /**
     * Calcular score manualmente (usado para validación)
     * @param {Object} criterios - Criterios de evaluación
     * @param {Object} pesos - Pesos de los criterios
     * @returns {number} - Score calculado
     */
    static calcularScore(criterios, pesos) {
        const {
            origen = 0,
            facturacion = 0,
            facturacion_potencial = 0,
            impacto_cliente = 0,
            esfuerzo = 0,
            incertidumbre = 0,
            riesgo = 0
        } = criterios;

        const {
            peso_origen = 1,
            peso_facturacion = 1,
            peso_facturacion_potencial = 1,
            peso_impacto_cliente = 1,
            peso_esfuerzo = 1,
            peso_incertidumbre = 1,
            peso_riesgo = 1
        } = pesos;

        const numerador = 
            (origen * peso_origen) +
            (facturacion * peso_facturacion) +
            (facturacion_potencial * peso_facturacion_potencial) +
            (impacto_cliente * peso_impacto_cliente) +
            ((5 - esfuerzo) * peso_esfuerzo) +
            ((5 - incertidumbre) * peso_incertidumbre) +
            ((5 - riesgo) * peso_riesgo);

        const denominador = 
            peso_origen + peso_facturacion + peso_facturacion_potencial +
            peso_impacto_cliente + peso_esfuerzo + peso_incertidumbre + peso_riesgo;

        return numerador / denominador;
    }

    /**
     * Obtener ranking de proyectos por score
     * @param {number} limit - Límite de resultados
     */
    static async obtenerRanking(limit = 10) {
        try {
            const query = `
                SELECT 
                    v.redmine_id,
                    v.titulo,
                    v.seccion,
                    v.sponsor,
                    v.monto,
                    s.score_calculado,
                    s.origen,
                    s.facturacion,
                    s.facturacion_potencial,
                    s.impacto_cliente,
                    s.esfuerzo,
                    s.incertidumbre,
                    s.riesgo
                FROM v_backlog_proyectos_completos v
                LEFT JOIN score_backlog s ON v.redmine_id = s.funcionalidad_id
                WHERE s.score_calculado IS NOT NULL
                ORDER BY s.score_calculado DESC
                LIMIT $1
            `;
            const result = await pool.query(query, [limit]);
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
                    COUNT(*) as total_evaluados,
                    AVG(score_calculado) as score_promedio,
                    MAX(score_calculado) as score_maximo,
                    MIN(score_calculado) as score_minimo
                FROM score_backlog
            `;
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener estadísticas de scores:', error);
            throw error;
        }
    }
}

module.exports = ScoreBacklogModel;



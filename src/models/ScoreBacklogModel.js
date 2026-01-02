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
     * Actualizar score de un proyecto (solo criterios, mantiene pesos existentes)
     * @param {number} funcionalidad_id - ID del proyecto (redmine_id)
     * @param {Object} criterios - Criterios de evaluación
     */
    static async actualizar(funcionalidad_id, criterios) {
        try {
            // Obtener score existente para mantener los pesos
            let scoreExistente = await this.obtenerPorFuncionalidad(funcionalidad_id);
            
            if (!scoreExistente) {
                // Verificar si es un requerimiento de cliente
                const checkReqCliente = await pool.query(
                    'SELECT redmine_id FROM req_clientes WHERE redmine_id = $1 UNION SELECT redmine_id FROM redmine_req_clientes WHERE redmine_id = $1',
                    [funcionalidad_id]
                );
                
                if (checkReqCliente.rows.length > 0) {
                    // Es un requerimiento de cliente, pero score_backlog tiene foreign key a proyectos_internos
                    // Intentar crear el registro directamente sin usar actualizarPesos para evitar el error de foreign key
                    // Si falla, lanzar un error más claro
                    try {
                        const insertQuery = `
                            INSERT INTO score_backlog (funcionalidad_id,
                                origen, facturacion, facturacion_potencial, impacto_cliente,
                                esfuerzo, incertidumbre, riesgo,
                                peso_origen, peso_facturacion, peso_facturacion_potencial, peso_impacto_cliente,
                                peso_esfuerzo, peso_incertidumbre, peso_riesgo)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                            RETURNING *
                        `;
                        const insertValues = [
                            funcionalidad_id,
                            criterios.origen || 0,
                            criterios.facturacion || 0,
                            criterios.facturacion_potencial || 0,
                            criterios.impacto_cliente || 0,
                            criterios.esfuerzo || 0,
                            criterios.incertidumbre || 0,
                            criterios.riesgo || 0,
                            40.00, // peso_origen
                            40.00, // peso_facturacion
                            20.00, // peso_facturacion_potencial
                            40.00, // peso_impacto_cliente
                            40.00, // peso_esfuerzo
                            30.00, // peso_incertidumbre
                            30.00  // peso_riesgo
                        ];
                        const insertResult = await pool.query(insertQuery, insertValues);
                        scoreExistente = insertResult.rows[0];
                } catch (insertError) {
                    if (insertError.code === '23503') {
                        // La foreign key constraint falla porque req_clientes no está en proyectos_internos
                        // Necesitamos modificar la constraint de la BD para que acepte ambos
                        console.error(`Error de foreign key al crear score para req_cliente ${funcionalidad_id}:`, insertError.message);
                        throw new Error(`No se puede crear score para requerimiento de cliente ${funcionalidad_id}. La tabla score_backlog tiene una foreign key constraint que requiere que el ID exista en proyectos_internos. Se necesita modificar la constraint de la base de datos para permitir req_clientes también.`);
                    }
                    throw insertError;
                }
                } else {
                    // Es un proyecto interno, usar el método normal
                    await this.actualizarPesos(funcionalidad_id, {
                        peso_facturacion: 40.00,
                        peso_facturacion_potencial: 20.00,
                        peso_impacto_cliente: 40.00,
                        peso_esfuerzo: 40.00,
                        peso_incertidumbre: 30.00,
                        peso_riesgo: 30.00
                    });
                    // Ahora actualizar los criterios
                    scoreExistente = await this.obtenerPorFuncionalidad(funcionalidad_id);
                }
            }
            
            // Actualizar SOLO los criterios, NO los pesos (evita overflow)
            // score_calculado es una columna generada, se calcula automáticamente
            const query = `
                UPDATE score_backlog
                SET origen = $1,
                    facturacion = $2,
                    facturacion_potencial = $3,
                    impacto_cliente = $4,
                    esfuerzo = $5,
                    incertidumbre = $6,
                    riesgo = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE funcionalidad_id = $8
                RETURNING *
            `;
            const values = [
                criterios.origen || 0,
                criterios.facturacion || 0,
                criterios.facturacion_potencial || 0,
                criterios.impacto_cliente || 0,
                criterios.esfuerzo || 0,
                criterios.incertidumbre || 0,
                criterios.riesgo || 0,
                funcionalidad_id
            ];
            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al actualizar score:', error);
            throw error;
        }
    }

    /**
     * Actualizar pesos de criterios
     * @param {number} funcionalidad_id - ID del proyecto (redmine_id)
     * @param {Object} pesos - Pesos de los criterios
     */
    static async actualizarPesos(funcionalidad_id, pesos) {
        try {
            // Verificar si existe el score, si no, crearlo con valores por defecto
            let score = await this.obtenerPorFuncionalidad(funcionalidad_id);
            
            if (!score) {
                // Verificar que el funcionalidad_id existe en proyectos_internos o req_clientes
                // para evitar errores de foreign key constraint
                const checkProyecto = await pool.query(
                    'SELECT redmine_id FROM proyectos_internos WHERE redmine_id = $1',
                    [funcionalidad_id]
                );
                const checkReqCliente = await pool.query(
                    'SELECT redmine_id FROM req_clientes WHERE redmine_id = $1',
                    [funcionalidad_id]
                );
                
                if (checkProyecto.rows.length === 0 && checkReqCliente.rows.length === 0) {
                    // Si no existe en ninguna tabla, verificar en redmine_*
                    const checkRedmineProyecto = await pool.query(
                        'SELECT redmine_id FROM redmine_proyectos_internos WHERE redmine_id = $1',
                        [funcionalidad_id]
                    );
                    const checkRedmineReqCliente = await pool.query(
                        'SELECT redmine_id FROM redmine_req_clientes WHERE redmine_id = $1',
                        [funcionalidad_id]
                    );
                    
                    if (checkRedmineProyecto.rows.length === 0 && checkRedmineReqCliente.rows.length === 0) {
                        throw new Error(`El ID ${funcionalidad_id} no existe en proyectos_internos ni en req_clientes`);
                    }
                }
                
                // Crear score nuevo con valores por defecto y pesos correctos
                // Si es req_cliente, la foreign key fallará, pero intentamos igual
                // (puede que la constraint sea más flexible de lo que parece)
                try {
                    const insertQuery = `
                        INSERT INTO score_backlog (funcionalidad_id,
                            peso_origen, peso_facturacion, peso_facturacion_potencial, peso_impacto_cliente,
                            peso_esfuerzo, peso_incertidumbre, peso_riesgo)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING *
                    `;
                    const insertValues = [
                        funcionalidad_id,
                        40.00, // peso_origen
                        40.00, // peso_facturacion
                        20.00, // peso_facturacion_potencial
                        40.00, // peso_impacto_cliente
                        40.00, // peso_esfuerzo
                        30.00, // peso_incertidumbre
                        30.00  // peso_riesgo
                    ];
                    const insertResult = await pool.query(insertQuery, insertValues);
                    score = insertResult.rows[0];
                } catch (insertError) {
                    // Si falla por foreign key, verificar si es porque es req_cliente
                    if (insertError.code === '23503' && checkReqCliente.rows.length > 0) {
                        // Para req_clientes, necesitamos crear primero el registro en proyectos_internos
                        // o modificar la constraint. Por ahora, lanzamos un error más claro
                        throw new Error(`No se puede crear score para requerimiento de cliente ${funcionalidad_id}. La foreign key constraint requiere que exista en proyectos_internos.`);
                    }
                    throw insertError;
                }
            }
            
            // Actualizar pesos
            const query = `
                UPDATE score_backlog
                SET peso_origen = $1,
                    peso_facturacion = $2,
                    peso_facturacion_potencial = $3,
                    peso_impacto_cliente = $4,
                    peso_esfuerzo = $5,
                    peso_incertidumbre = $6,
                    peso_riesgo = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE funcionalidad_id = $8
                RETURNING *
            `;
            const values = [
                pesos.peso_origen || 40.00,
                pesos.peso_facturacion || 40.00,
                pesos.peso_facturacion_potencial || 20.00,
                pesos.peso_impacto_cliente || 40.00,
                pesos.peso_esfuerzo || 40.00,
                pesos.peso_incertidumbre || 30.00,
                pesos.peso_riesgo || 30.00,
                funcionalidad_id
            ];
            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al actualizar pesos:', error);
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
            // NO usar este método directamente - usar actualizar() o actualizarPesos()
            // Este método solo se mantiene por compatibilidad pero no debe usarse
            // porque los campos de peso son NUMERIC(3,2) y no pueden almacenar valores > 9.99
            
            // Primero crear el registro con pesos usando actualizarPesos
            await this.actualizarPesos(funcionalidad_id, {
                peso_facturacion: criterios.peso_facturacion || 40.00,
                peso_facturacion_potencial: criterios.peso_facturacion_potencial || 20.00,
                peso_impacto_cliente: criterios.peso_impacto_cliente || 40.00,
                peso_esfuerzo: criterios.peso_esfuerzo || 40.00,
                peso_incertidumbre: criterios.peso_incertidumbre || 30.00,
                peso_riesgo: criterios.peso_riesgo || 30.00
            });
            
            // Luego actualizar solo los criterios
            const query = `
                UPDATE score_backlog
                SET origen = $1,
                    facturacion = $2,
                    facturacion_potencial = $3,
                    impacto_cliente = $4,
                    esfuerzo = $5,
                    incertidumbre = $6,
                    riesgo = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE funcionalidad_id = $8
                RETURNING *
            `;
            const values = [
                criterios.origen || 0,
                criterios.facturacion || 0,
                criterios.facturacion_potencial || 0,
                criterios.impacto_cliente || 0,
                criterios.esfuerzo || 0,
                criterios.incertidumbre || 0,
                criterios.riesgo || 0,
                funcionalidad_id
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
     * USA LA MISMA LÓGICA QUE ScoreModel.calcularScore()
     * Ignora 'origen' ya que no se usa en el cálculo del score (solo se guarda)
     * @param {Object} criterios - Criterios de evaluación
     * @param {Object} pesos - Pesos de los criterios
     * @returns {number} - Score calculado
     */
    static calcularScore(criterios, pesos) {
        // Asegurar que los valores sean numéricos (igual que ScoreModel)
        const facturacion = parseFloat(criterios.facturacion) || 0;
        const facturacion_potencial = parseFloat(criterios.facturacion_potencial) || 0;
        const impacto_cliente = parseFloat(criterios.impacto_cliente) || 0;
        const esfuerzo = parseFloat(criterios.esfuerzo) || 0;
        const incertidumbre = parseFloat(criterios.incertidumbre) || 0;
        const riesgo = parseFloat(criterios.riesgo) || 0;
        
        // Obtener pesos (pueden venir con o sin prefijo peso_) - igual que ScoreModel
        const peso_facturacion = parseFloat(pesos.peso_facturacion || pesos.facturacion || 40);
        const peso_facturacion_potencial = parseFloat(pesos.peso_facturacion_potencial || pesos.facturacion_potencial || 20);
        const peso_impacto_cliente = parseFloat(pesos.peso_impacto_cliente || pesos.impacto_cliente || 40);
        const peso_esfuerzo = parseFloat(pesos.peso_esfuerzo || pesos.esfuerzo || 40);
        const peso_incertidumbre = parseFloat(pesos.peso_incertidumbre || pesos.incertidumbre || 30);
        const peso_riesgo = parseFloat(pesos.peso_riesgo || pesos.riesgo || 30);
        
        // Calcular promedio ponderado de valores positivos (usando pesos) - MISMA LÓGICA
        const sumaPonderadaPositivos = (
            (facturacion * peso_facturacion / 100) +
            (facturacion_potencial * peso_facturacion_potencial / 100) +
            (impacto_cliente * peso_impacto_cliente / 100)
        );
        const sumaPesosPositivos = peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente;
        const promedioPositivos = sumaPesosPositivos > 0 ? sumaPonderadaPositivos / (sumaPesosPositivos / 100) : 0;
        
        // Calcular promedio ponderado de valores negativos (usando pesos) - MISMA LÓGICA
        const sumaPonderadaNegativos = (
            (esfuerzo * peso_esfuerzo / 100) +
            (incertidumbre * peso_incertidumbre / 100) +
            (riesgo * peso_riesgo / 100)
        );
        const sumaPesosNegativos = peso_esfuerzo + peso_incertidumbre + peso_riesgo;
        const promedioNegativos = sumaPesosNegativos > 0 ? sumaPonderadaNegativos / (sumaPesosNegativos / 100) : 0;
        
        // Score = promedio positivos - (promedio negativos × 0.20) - MISMA FÓRMULA
        const score = promedioPositivos - (promedioNegativos * 0.20);
        return parseFloat(score.toFixed(2));
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
                    s.score_calculado,
                    s.origen,
                    s.facturacion,
                    s.facturacion_potencial,
                    s.impacto_cliente,
                    s.esfuerzo,
                    s.incertidumbre,
                    s.riesgo
                FROM v_proyectos_internos_completos v
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



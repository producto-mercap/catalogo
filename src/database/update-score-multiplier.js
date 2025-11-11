/**
 * Script para actualizar el multiplicador de score_calculado de 0.5 a 0.25
 * Ejecutar con: node catalogo/src/database/update-score-multiplier.js
 */

// Cargar variables de entorno primero
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { pool } = require('../config/database');

async function actualizarScoreCalculado() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('🔄 Actualizando fórmula de score_calculado (0.5 → 0.25)...\n');

        // Verificar si la columna existe
        const checkColumn = await client.query(`
            SELECT column_name, is_generated
            FROM information_schema.columns
            WHERE table_name = 'score' AND column_name = 'score_calculado'
        `);

        if (checkColumn.rows.length === 0) {
            console.log('⚠️ La columna score_calculado no existe. Creándola...\n');
        } else {
            console.log('📋 Columna score_calculado encontrada. Actualizando...\n');
        }

        // Eliminar la columna si existe
        await client.query('ALTER TABLE score DROP COLUMN IF EXISTS score_calculado CASCADE');

        // Recrear con la nueva fórmula que coincide exactamente con ScoreModel.calcularScore()
        // Fórmula: promedioPositivos - (promedioNegativos * 0.25)
        const createColumnQuery = `
            ALTER TABLE score ADD COLUMN score_calculado DECIMAL(5, 2) GENERATED ALWAYS AS (
                CASE 
                    WHEN (peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente) > 0 
                     AND (peso_esfuerzo + peso_incertidumbre + peso_riesgo) > 0 THEN
                        -- Promedio ponderado de positivos
                        (
                            (facturacion * peso_facturacion / 100.0) +
                            (facturacion_potencial * peso_facturacion_potencial / 100.0) +
                            (impacto_cliente * peso_impacto_cliente / 100.0)
                        ) / (
                            (peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente) / 100.0
                        ) -
                        -- Promedio ponderado de negativos × 0.25 (cambiado de 0.5)
                        (
                            (
                                (esfuerzo * peso_esfuerzo / 100.0) +
                                (incertidumbre * peso_incertidumbre / 100.0) +
                                (riesgo * peso_riesgo / 100.0)
                            ) / (
                                (peso_esfuerzo + peso_incertidumbre + peso_riesgo) / 100.0
                            )
                        ) * 0.25
                    WHEN (peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente) > 0 THEN
                        -- Solo positivos
                        (
                            (facturacion * peso_facturacion / 100.0) +
                            (facturacion_potencial * peso_facturacion_potencial / 100.0) +
                            (impacto_cliente * peso_impacto_cliente / 100.0)
                        ) / (
                            (peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente) / 100.0
                        )
                    ELSE 0
                END
            ) STORED
        `;
        
        await client.query(createColumnQuery);
        console.log('✅ Columna score_calculado actualizada con multiplicador 0.25\n');

        // Agregar comentario
        await client.query(`
            COMMENT ON COLUMN score.score_calculado IS 
            'Score calculado: promedio positivos - (promedio negativos × 0.25)'
        `);

        await client.query('COMMIT');
        
        console.log('🎉 Actualización completada exitosamente\n');
        console.log('📊 Verificando algunos scores recalculados...\n');
        
        // Verificar algunos scores
        const sampleScores = await client.query(`
            SELECT 
                funcionalidad_id,
                facturacion, impacto_cliente, esfuerzo, riesgo,
                score_calculado
            FROM score
            WHERE score_calculado IS NOT NULL
            ORDER BY funcionalidad_id
            LIMIT 5
        `);
        
        if (sampleScores.rows.length > 0) {
            console.log('Ejemplos de scores (ahora con multiplicador 0.25):');
            sampleScores.rows.forEach(row => {
                console.log(`  Funcionalidad ${row.funcionalidad_id}: ${parseFloat(row.score_calculado).toFixed(2)}`);
            });
        } else {
            console.log('ℹ️ No hay scores en la base de datos aún');
        }
        
        console.log('\n✅ Proceso completado');
        console.log('   Ahora el score_calculado en la BD coincide con el cálculo en JavaScript\n');

        process.exit(0);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error al actualizar score_calculado:', error);
        console.error('   Mensaje:', error.message);
        if (error.stack) {
            console.error('   Stack:', error.stack);
        }
        process.exit(1);
    } finally {
        client.release();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    actualizarScoreCalculado();
}

module.exports = { actualizarScoreCalculado };

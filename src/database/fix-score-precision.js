/**
 * Script para verificar y corregir la precisión de score_calculado
 * El problema: se guarda como 6 en lugar de 6.88
 * Ejecutar con: node catalogo/src/database/fix-score-precision.js
 */

// Cargar variables de entorno primero
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { pool } = require('../config/database');

async function fixScorePrecision() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('🔍 Verificando definición de score_calculado...\n');

        // Verificar el tipo de dato actual
        const columnInfo = await client.query(`
            SELECT 
                column_name,
                data_type,
                numeric_precision,
                numeric_scale,
                is_generated,
                generation_expression
            FROM information_schema.columns
            WHERE table_name = 'score' AND column_name = 'score_calculado'
        `);

        if (columnInfo.rows.length === 0) {
            console.log('❌ La columna score_calculado no existe\n');
            process.exit(1);
        }

        const col = columnInfo.rows[0];
        console.log('📋 Información actual de la columna:');
        console.log(`   Tipo: ${col.data_type}`);
        console.log(`   Precisión: ${col.numeric_precision || 'N/A'}`);
        console.log(`   Escala: ${col.numeric_scale || 'N/A'}`);
        console.log(`   Es generada: ${col.is_generated}\n`);

        // Verificar algunos valores para ver si están redondeados incorrectamente
        const sampleScores = await client.query(`
            SELECT 
                funcionalidad_id,
                facturacion, impacto_cliente, esfuerzo,
                score_calculado,
                CAST(score_calculado AS TEXT) as score_text
            FROM score
            WHERE score_calculado IS NOT NULL
            LIMIT 5
        `);

        console.log('📊 Ejemplos de scores actuales:');
        sampleScores.rows.forEach(row => {
            console.log(`   Funcionalidad ${row.funcionalidad_id}: ${row.score_text} (tipo: ${typeof row.score_calculado})`);
        });
        console.log('');

        // Verificar si el problema es la precisión de la columna
        if (col.numeric_scale !== 2 || col.numeric_precision < 5) {
            console.log('⚠️ La columna no tiene la precisión correcta. Corrigiendo...\n');
            
            // Eliminar y recrear con la precisión correcta
            await client.query('ALTER TABLE score DROP COLUMN IF EXISTS score_calculado CASCADE');

            // Recrear con DECIMAL(10, 2) para mayor precisión
            const createColumnQuery = `
                ALTER TABLE score ADD COLUMN score_calculado NUMERIC(10, 2) GENERATED ALWAYS AS (
                    CASE 
                        WHEN (peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente) > 0 
                         AND (peso_esfuerzo + peso_incertidumbre + peso_riesgo) > 0 THEN
                            ROUND(
                                (
                                    (
                                        (facturacion * peso_facturacion / 100.0) +
                                        (facturacion_potencial * peso_facturacion_potencial / 100.0) +
                                        (impacto_cliente * peso_impacto_cliente / 100.0)
                                    ) / (
                                        (peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente) / 100.0
                                    ) -
                                    (
                                        (
                                            (esfuerzo * peso_esfuerzo / 100.0) +
                                            (incertidumbre * peso_incertidumbre / 100.0) +
                                            (riesgo * peso_riesgo / 100.0)
                                        ) / (
                                            (peso_esfuerzo + peso_incertidumbre + peso_riesgo) / 100.0
                                        )
                                    ) * 0.25
                                )::NUMERIC,
                                2
                            )
                        WHEN (peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente) > 0 THEN
                            ROUND(
                                (
                                    (facturacion * peso_facturacion / 100.0) +
                                    (facturacion_potencial * peso_facturacion_potencial / 100.0) +
                                    (impacto_cliente * peso_impacto_cliente / 100.0)
                                ) / (
                                    (peso_facturacion + peso_facturacion_potencial + peso_impacto_cliente) / 100.0
                                )::NUMERIC,
                                2
                            )
                        ELSE 0
                    END
                ) STORED
            `;
            
            await client.query(createColumnQuery);
            console.log('✅ Columna recreada con NUMERIC(10, 2) y ROUND(..., 2)\n');
        } else {
            console.log('ℹ️ La precisión de la columna parece correcta\n');
            console.log('🔍 Verificando si el problema está en el cálculo...\n');
            
            // Verificar un cálculo específico
            const testCalc = await client.query(`
                SELECT 
                    funcionalidad_id,
                    facturacion, impacto_cliente, esfuerzo,
                    peso_facturacion, peso_impacto_cliente, peso_esfuerzo,
                    score_calculado,
                    -- Calcular manualmente para comparar
                    (
                        (
                            (facturacion * peso_facturacion / 100.0) +
                            (impacto_cliente * peso_impacto_cliente / 100.0)
                        ) / (
                            (peso_facturacion + peso_impacto_cliente) / 100.0
                        ) -
                        (
                            (esfuerzo * peso_esfuerzo / 100.0) / (peso_esfuerzo / 100.0)
                        ) * 0.25
                    )::NUMERIC(10, 2) as calculo_manual
                FROM score
                WHERE score_calculado IS NOT NULL
                LIMIT 1
            `);
            
            if (testCalc.rows.length > 0) {
                const row = testCalc.rows[0];
                console.log(`   Score calculado: ${row.score_calculado}`);
                console.log(`   Cálculo manual: ${row.calculo_manual}`);
                console.log(`   Diferencia: ${Math.abs(parseFloat(row.score_calculado) - parseFloat(row.calculo_manual))}\n`);
            }
        }

        await client.query('COMMIT');
        
        console.log('✅ Verificación completada\n');
        console.log('📊 Verificando scores después de la corrección...\n');
        
        // Verificar algunos scores
        const finalScores = await client.query(`
            SELECT 
                funcionalidad_id,
                score_calculado,
                CAST(score_calculado AS TEXT) as score_text
            FROM score
            WHERE score_calculado IS NOT NULL
            ORDER BY funcionalidad_id
            LIMIT 5
        `);
        
        if (finalScores.rows.length > 0) {
            console.log('Ejemplos de scores (con 2 decimales):');
            finalScores.rows.forEach(row => {
                const score = parseFloat(row.score_calculado);
                console.log(`  Funcionalidad ${row.funcionalidad_id}: ${score.toFixed(2)}`);
            });
        }

        console.log('\n✅ Proceso completado\n');

        process.exit(0);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error);
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
    fixScorePrecision();
}

module.exports = { fixScorePrecision };


/**
 * Script para verificar la consistencia del score entre JavaScript y la base de datos
 * Ejecutar con: node catalogo/src/database/verify-score-consistency.js
 */

// Cargar variables de entorno primero
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { pool } = require('../config/database');
const ScoreModel = require('../models/ScoreModel');

async function verificarConsistencia() {
    const client = await pool.connect();
    try {
        console.log('🔍 Verificando consistencia de scores...\n');

        // Obtener algunos scores de la base de datos
        const scoresBD = await client.query(`
            SELECT 
                funcionalidad_id,
                facturacion, facturacion_potencial, impacto_cliente,
                esfuerzo, incertidumbre, riesgo,
                peso_facturacion, peso_facturacion_potencial, peso_impacto_cliente,
                peso_esfuerzo, peso_incertidumbre, peso_riesgo,
                score_calculado
            FROM score
            WHERE score_calculado IS NOT NULL
            LIMIT 5
        `);

        if (scoresBD.rows.length === 0) {
            console.log('ℹ️ No hay scores en la base de datos para verificar\n');
            return;
        }

        console.log('📊 Comparando scores:\n');
        console.log('Funcionalidad | BD (score_calculado) | JS (calcularScore) | Diferencia');
        console.log('─'.repeat(70));

        let inconsistencias = 0;

        for (const row of scoresBD.rows) {
            const criterios = {
                facturacion: row.facturacion,
                facturacion_potencial: row.facturacion_potencial,
                impacto_cliente: row.impacto_cliente,
                esfuerzo: row.esfuerzo,
                incertidumbre: row.incertidumbre,
                riesgo: row.riesgo
            };

            const pesos = {
                peso_facturacion: row.peso_facturacion,
                peso_facturacion_potencial: row.peso_facturacion_potencial,
                peso_impacto_cliente: row.peso_impacto_cliente,
                peso_esfuerzo: row.peso_esfuerzo,
                peso_incertidumbre: row.peso_incertidumbre,
                peso_riesgo: row.peso_riesgo
            };

            const scoreBD = parseFloat(row.score_calculado);
            const scoreJS = ScoreModel.calcularScore(criterios, pesos);
            const diferencia = Math.abs(scoreBD - scoreJS);

            const status = diferencia < 0.01 ? '✅' : '❌';
            if (diferencia >= 0.01) inconsistencias++;

            console.log(
                `${status} ${row.funcionalidad_id.toString().padEnd(12)} | ` +
                `${scoreBD.toFixed(2).padStart(20)} | ` +
                `${scoreJS.toFixed(2).padStart(17)} | ` +
                `${diferencia.toFixed(4)}`
            );
        }

        console.log('─'.repeat(70));
        
        if (inconsistencias === 0) {
            console.log('\n✅ Todos los scores son consistentes entre BD y JavaScript\n');
        } else {
            console.log(`\n⚠️ Se encontraron ${inconsistencias} inconsistencias\n`);
            console.log('Posibles causas:');
            console.log('  1. La columna score_calculado en la BD aún usa la fórmula antigua');
            console.log('  2. Hay diferencias de precisión en los cálculos');
            console.log('  3. La vista v_funcionalidades_completas tiene su propia fórmula\n');
        }

        // Verificar la definición de la vista
        console.log('📋 Verificando definición de la vista v_funcionalidades_completas...\n');
        const viewDef = await client.query(`
            SELECT view_definition 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = 'v_funcionalidades_completas'
        `);

        if (viewDef.rows.length > 0) {
            const definition = viewDef.rows[0].view_definition;
            if (definition.includes('score_total')) {
                console.log('ℹ️ La vista contiene score_total');
                if (definition.includes('0.5')) {
                    console.log('⚠️ La vista puede tener la fórmula antigua (0.5)');
                } else if (definition.includes('0.25')) {
                    console.log('✅ La vista usa el multiplicador correcto (0.25)');
                } else {
                    console.log('ℹ️ La vista puede usar score_calculado de la tabla score');
                }
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error al verificar consistencia:', error);
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
    verificarConsistencia();
}

module.exports = { verificarConsistencia };


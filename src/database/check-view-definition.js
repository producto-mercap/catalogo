/**
 * Script para verificar la definición de la vista v_funcionalidades_completas
 * y ver si score_total tiene su propia fórmula
 */

// Cargar variables de entorno primero
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { pool } = require('../config/database');

async function checkViewDefinition() {
    const client = await pool.connect();
    try {
        console.log('🔍 Verificando definición de v_funcionalidades_completas...\n');

        // Obtener la definición de la vista
        const viewDef = await client.query(`
            SELECT view_definition 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = 'v_funcionalidades_completas'
        `);

        if (viewDef.rows.length === 0) {
            console.log('❌ La vista v_funcionalidades_completas no existe\n');
            return;
        }

        const definition = viewDef.rows[0].view_definition;
        console.log('📋 Definición de la vista:\n');
        console.log(definition);
        console.log('\n');

        // Buscar referencias a score_total
        if (definition.includes('score_total')) {
            console.log('✅ La vista contiene score_total\n');
            
            // Verificar si score_total tiene su propia fórmula
            if (definition.match(/score_total.*AS.*\(/i)) {
                console.log('⚠️ score_total tiene su propia fórmula calculada\n');
                console.log('Esto podría ser el problema si usa la fórmula antigua (0.5)\n');
            } else if (definition.includes('score_calculado')) {
                console.log('ℹ️ score_total probablemente es un alias de score_calculado\n');
            }
        }

        // Comparar score_total vs score_calculado en algunos registros
        console.log('📊 Comparando score_total vs score_calculado:\n');
        const comparison = await client.query(`
            SELECT 
                v.redmine_id,
                v.score_total,
                s.score_calculado,
                v.score_total = s.score_calculado as son_iguales,
                ABS(COALESCE(v.score_total, 0) - COALESCE(s.score_calculado, 0)) as diferencia
            FROM v_funcionalidades_completas v
            LEFT JOIN score s ON v.redmine_id = s.funcionalidad_id
            WHERE s.score_calculado IS NOT NULL
            LIMIT 10
        `);

        console.log('redmine_id | score_total | score_calculado | ¿Iguales? | Diferencia');
        console.log('─'.repeat(70));
        comparison.rows.forEach(row => {
            const iguales = row.son_iguales ? '✅' : '❌';
            console.log(
                `${row.redmine_id.toString().padEnd(10)} | ` +
                `${(row.score_total || 'NULL').toString().padEnd(12)} | ` +
                `${(row.score_calculado || 'NULL').toString().padEnd(15)} | ` +
                `${iguales.padEnd(9)} | ` +
                `${row.diferencia}`
            );
        });

        process.exit(0);
    } catch (error) {
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
    checkViewDefinition();
}

module.exports = { checkViewDefinition };


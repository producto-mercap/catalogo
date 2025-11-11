/**
 * Script para inicializar las tablas de backlog_proyectos
 * Ejecutar con: node catalogo/src/database/init-backlog.js
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function inicializarBacklog() {
    try {
        console.log('🚀 Iniciando creación de tablas para Backlog Proyectos...\n');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, 'create_backlog_proyectos.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar el script SQL
        await pool.query(sql);

        console.log('✅ Tablas de Backlog Proyectos creadas exitosamente\n');
        console.log('Tablas creadas:');
        console.log('  - backlog_proyectos');
        console.log('  - redmine_backlog_issues');
        console.log('  - score_backlog');
        console.log('  - v_backlog_proyectos_completos (vista)\n');

        // Verificar que las tablas se crearon correctamente
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('backlog_proyectos', 'redmine_backlog_issues', 'score_backlog')
            ORDER BY table_name
        `);

        console.log('✅ Verificación completada:');
        result.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });

        // Verificar la vista
        const viewResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = 'v_backlog_proyectos_completos'
        `);

        if (viewResult.rows.length > 0) {
            console.log(`  ✓ v_backlog_proyectos_completos (vista)`);
        }

        console.log('\n🎉 Inicialización completada exitosamente\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error al inicializar tablas:', error);
        console.error('   Mensaje:', error.message);
        if (error.stack) {
            console.error('   Stack:', error.stack);
        }
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    inicializarBacklog();
}

module.exports = { inicializarBacklog };



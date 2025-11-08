const { pool } = require('../config/database');

class MapaModel {
    /**
     * Obtener mapa completo (clientes x funcionalidades)
     */
    static async obtenerMapa() {
        try {
            // Obtener todos los clientes
            const queryClientes = 'SELECT * FROM clientes WHERE activo = true ORDER BY nombre';
            const resultClientes = await pool.query(queryClientes);
            
            // Obtener todas las funcionalidades
            const queryFuncionalidades = `
                SELECT f.*, s.score_calculado 
                FROM funcionalidades f
                LEFT JOIN score s ON f.id = s.funcionalidad_id
                ORDER BY f.titulo
            `;
            const resultFuncionalidades = await pool.query(queryFuncionalidades);
            
            // Obtener todas las relaciones
            const queryRelaciones = `
                SELECT 
                    cliente_id,
                    funcionalidad_id,
                    estado_comercial,
                    fecha_inicio,
                    fecha_fin
                FROM cliente_funcionalidad
            `;
            const resultRelaciones = await pool.query(queryRelaciones);
            
            // Crear mapa de relaciones para acceso rápido
            const relacionesMap = {};
            resultRelaciones.rows.forEach(rel => {
                const key = `${rel.cliente_id}-${rel.funcionalidad_id}`;
                relacionesMap[key] = {
                    estado: rel.estado_comercial,
                    fecha_inicio: rel.fecha_inicio,
                    fecha_fin: rel.fecha_fin
                };
            });
            
            return {
                clientes: resultClientes.rows,
                funcionalidades: resultFuncionalidades.rows,
                relaciones: relacionesMap
            };
        } catch (error) {
            console.error('Error al obtener mapa:', error);
            throw error;
        }
    }

    /**
     * Actualizar estado comercial de cliente-funcionalidad
     */
    static async actualizarEstado(clienteId, funcionalidadId, datos) {
        try {
            const query = `
                INSERT INTO cliente_funcionalidad 
                (cliente_id, funcionalidad_id, estado_comercial, fecha_inicio, fecha_fin, notas)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (cliente_id, funcionalidad_id) 
                DO UPDATE SET 
                    estado_comercial = $3,
                    fecha_inicio = $4,
                    fecha_fin = $5,
                    notas = $6
                RETURNING *
            `;
            const values = [
                clienteId,
                funcionalidadId,
                datos.estado_comercial,
                datos.fecha_inicio || null,
                datos.fecha_fin || null,
                datos.notas || null
            ];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            throw error;
        }
    }

    /**
     * Eliminar relación cliente-funcionalidad
     */
    static async eliminarRelacion(clienteId, funcionalidadId) {
        try {
            const query = `
                DELETE FROM cliente_funcionalidad 
                WHERE cliente_id = $1 AND funcionalidad_id = $2
                RETURNING *
            `;
            const result = await pool.query(query, [clienteId, funcionalidadId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar relación:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas del mapa
     */
    static async obtenerEstadisticas() {
        try {
            const query = `
                SELECT 
                    estado_comercial,
                    COUNT(*) as cantidad
                FROM cliente_funcionalidad
                GROUP BY estado_comercial
                ORDER BY cantidad DESC
            `;
            const result = await pool.query(query);
            
            // Total de relaciones
            const queryTotal = 'SELECT COUNT(*) as total FROM cliente_funcionalidad';
            const resultTotal = await pool.query(queryTotal);
            
            return {
                por_estado: result.rows,
                total: resultTotal.rows[0].total
            };
        } catch (error) {
            console.error('Error al obtener estadísticas del mapa:', error);
            throw error;
        }
    }

    /**
     * Obtener funcionalidades más implementadas
     */
    static async obtenerTopFuncionalidades(limite = 10) {
        try {
            const query = `
                SELECT 
                    f.id,
                    f.titulo,
                    f.seccion,
                    COUNT(cf.id) as total_clientes,
                    COUNT(CASE WHEN cf.estado_comercial = 'Implementado' THEN 1 END) as implementados
                FROM funcionalidades f
                LEFT JOIN cliente_funcionalidad cf ON f.id = cf.funcionalidad_id
                GROUP BY f.id, f.titulo, f.seccion
                ORDER BY total_clientes DESC
                LIMIT $1
            `;
            const result = await pool.query(query, [limite]);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener top funcionalidades:', error);
            throw error;
        }
    }
}

module.exports = MapaModel;


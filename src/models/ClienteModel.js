const { pool } = require('../config/database');

class ClienteModel {
    /**
     * Obtener todos los clientes
     */
    static async obtenerTodos() {
        try {
            const query = 'SELECT * FROM clientes ORDER BY nombre ASC';
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener clientes:', error);
            throw error;
        }
    }

    /**
     * Obtener cliente por ID
     */
    static async obtenerPorId(id) {
        try {
            const query = 'SELECT * FROM clientes WHERE id = $1';
            const result = await pool.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener cliente:', error);
            throw error;
        }
    }

    /**
     * Crear nuevo cliente
     */
    static async crear(datos) {
        try {
            const query = `
                INSERT INTO clientes (nombre, codigo, activo)
                VALUES ($1, $2, $3)
                RETURNING *
            `;
            const values = [datos.nombre, datos.codigo, datos.activo !== false];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error al crear cliente:', error);
            throw error;
        }
    }

    /**
     * Actualizar cliente
     */
    static async actualizar(id, datos) {
        try {
            const query = `
                UPDATE clientes
                SET nombre = $1, codigo = $2, activo = $3
                WHERE id = $4
                RETURNING *
            `;
            const values = [datos.nombre, datos.codigo, datos.activo !== false, id];
            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al actualizar cliente:', error);
            throw error;
        }
    }

    /**
     * Eliminar cliente
     */
    static async eliminar(id) {
        try {
            const query = 'DELETE FROM clientes WHERE id = $1 RETURNING *';
            const result = await pool.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            throw error;
        }
    }

    /**
     * Obtener funcionalidades de un cliente
     */
    static async obtenerFuncionalidades(clienteId) {
        try {
            const query = `
                SELECT 
                    f.*,
                    cf.estado_comercial,
                    cf.fecha_inicio,
                    cf.fecha_fin,
                    cf.notas,
                    s.score_calculado
                FROM cliente_funcionalidad cf
                JOIN funcionalidades f ON cf.funcionalidad_id = f.id
                LEFT JOIN score s ON f.id = s.funcionalidad_id
                WHERE cf.cliente_id = $1
                ORDER BY f.titulo
            `;
            const result = await pool.query(query, [clienteId]);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener funcionalidades del cliente:', error);
            throw error;
        }
    }
}

module.exports = ClienteModel;


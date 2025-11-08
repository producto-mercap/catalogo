const { pool } = require('../config/database');

class FuncionalidadModel {
    /**
     * Obtener todas las funcionalidades con sus scores
     */
    static async obtenerTodas(filtros = {}) {
        try {
            let query = `
                SELECT 
                    f.*,
                    s.origen, s.facturacion, s.urgencia, s.facturacion_potencial,
                    s.impacto_cliente, s.esfuerzo, s.incertidumbre, s.riesgo,
                    s.score_calculado
                FROM funcionalidades f
                LEFT JOIN score s ON f.id = s.funcionalidad_id
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

            // Filtro por búsqueda
            if (filtros.busqueda) {
                query += ` AND (
                    f.titulo ILIKE $${paramCount} OR 
                    f.descripcion ILIKE $${paramCount} OR 
                    f.sponsor ILIKE $${paramCount} OR 
                    f.seccion ILIKE $${paramCount}
                )`;
                params.push(`%${filtros.busqueda}%`);
                paramCount++;
            }

            // Filtro por sección
            if (filtros.seccion) {
                query += ` AND f.seccion = $${paramCount}`;
                params.push(filtros.seccion);
                paramCount++;
            }

            // Ordenamiento
            const ordenValido = ['titulo', 'score_total', 'monto', 'productivo_en', 'created_at'];
            const orden = ordenValido.includes(filtros.orden) ? filtros.orden : 'created_at';
            const direccion = filtros.direccion === 'asc' ? 'ASC' : 'DESC';
            query += ` ORDER BY f.${orden} ${direccion}`;

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener funcionalidades:', error);
            throw error;
        }
    }

    /**
     * Obtener funcionalidad por ID con score
     */
    static async obtenerPorId(id) {
        try {
            const query = `
                SELECT 
                    f.*,
                    s.origen, s.facturacion, s.urgencia, s.facturacion_potencial,
                    s.impacto_cliente, s.esfuerzo, s.incertidumbre, s.riesgo,
                    s.score_calculado,
                    s.peso_origen, s.peso_facturacion, s.peso_urgencia, 
                    s.peso_facturacion_potencial, s.peso_impacto_cliente,
                    s.peso_esfuerzo, s.peso_incertidumbre, s.peso_riesgo
                FROM funcionalidades f
                LEFT JOIN score s ON f.id = s.funcionalidad_id
                WHERE f.id = $1
            `;
            const result = await pool.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Crear nueva funcionalidad
     */
    static async crear(datos) {
        try {
            const query = `
                INSERT INTO funcionalidades 
                (titulo, descripcion, sponsor, epic_redmine, productivo_en, seccion, monto)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            const values = [
                datos.titulo,
                datos.descripcion,
                datos.sponsor,
                datos.epic_redmine,
                datos.productivo_en,
                datos.seccion,
                datos.monto
            ];
            const result = await pool.query(query, values);
            
            // Crear registro de score inicial
            await pool.query(
                'INSERT INTO score (funcionalidad_id) VALUES ($1)',
                [result.rows[0].id]
            );
            
            return result.rows[0];
        } catch (error) {
            console.error('Error al crear funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Actualizar funcionalidad
     */
    static async actualizar(id, datos) {
        try {
            const query = `
                UPDATE funcionalidades
                SET titulo = $1, 
                    descripcion = $2, 
                    sponsor = $3,
                    epic_redmine = $4,
                    productivo_en = $5,
                    seccion = $6,
                    monto = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $8
                RETURNING *
            `;
            const values = [
                datos.titulo,
                datos.descripcion,
                datos.sponsor,
                datos.epic_redmine,
                datos.productivo_en,
                datos.seccion,
                datos.monto,
                id
            ];
            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al actualizar funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Eliminar funcionalidad
     */
    static async eliminar(id) {
        try {
            const query = 'DELETE FROM funcionalidades WHERE id = $1 RETURNING *';
            const result = await pool.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Obtener secciones únicas
     */
    static async obtenerSecciones() {
        try {
            const query = `
                SELECT DISTINCT seccion 
                FROM funcionalidades 
                WHERE seccion IS NOT NULL 
                ORDER BY seccion
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.seccion);
        } catch (error) {
            console.error('Error al obtener secciones:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas
     */
    static async obtenerEstadisticas() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_funcionalidades,
                    AVG(score_total) as score_promedio,
                    SUM(monto) as monto_total,
                    COUNT(DISTINCT seccion) as total_secciones
                FROM funcionalidades
            `;
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            throw error;
        }
    }
}

module.exports = FuncionalidadModel;


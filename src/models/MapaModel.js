const { pool } = require('../config/database');

class MapaModel {
    /**
     * Obtener mapa completo (clientes x funcionalidades)
     */
    static async obtenerMapa() {
        try {
            // Orden por defecto de clientes
            const ordenDefecto = ['Macro', 'BH', 'GPET', 'Bancor', 'BST', 'VOII', 'Formosa', 'BMR', 'Naranja', 'Tarjeta', 'BLP', 'Chaco', 'Chubut'];
            
            // Obtener todos los clientes
            const queryClientes = 'SELECT * FROM clientes ORDER BY nombre';
            const resultClientes = await pool.query(queryClientes);
            
            // Ordenar clientes según el orden por defecto
            const clientesOrdenados = resultClientes.rows.sort((a, b) => {
                const indexA = ordenDefecto.indexOf(a.nombre);
                const indexB = ordenDefecto.indexOf(b.nombre);
                
                // Si ambos están en el orden por defecto, ordenar por índice
                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
                // Si solo A está en el orden, A va primero
                if (indexA !== -1) return -1;
                // Si solo B está en el orden, B va primero
                if (indexB !== -1) return 1;
                // Si ninguno está en el orden, ordenar alfabéticamente
                return a.nombre.localeCompare(b.nombre);
            });
            
            // Obtener todas las funcionalidades desde la vista combinada
            const queryFuncionalidades = `
                SELECT 
                    v.*, 
                    f.titulo_personalizado,
                    f.seccion,
                    f.descripcion,
                    f.monto,
                    s.score_calculado 
                FROM v_funcionalidades_completas v
                LEFT JOIN funcionalidades f ON v.redmine_id = f.redmine_id
                LEFT JOIN score s ON v.redmine_id = s.funcionalidad_id
                ORDER BY COALESCE(f.titulo_personalizado, v.titulo)
            `;
            const resultFuncionalidades = await pool.query(queryFuncionalidades);
            
            // Actualizar relaciones automáticas basadas en req. clientes con reventa "Si"
            await this.actualizarRelacionesAutomaticas();
            
            // Obtener todas las relaciones
            const queryRelaciones = `
                SELECT 
                    cliente_id,
                    funcionalidad_id,
                    estado_comercial,
                    version,
                    created_at,
                    updated_at
                FROM cliente_funcionalidad
            `;
            const resultRelaciones = await pool.query(queryRelaciones);
            
            // Crear mapa de relaciones para acceso rápido
            const relacionesMap = {};
            resultRelaciones.rows.forEach(rel => {
                const key = `${rel.cliente_id}-${rel.funcionalidad_id}`;
                relacionesMap[key] = {
                    estado: rel.estado_comercial,
                    version: rel.version || null,
                    created_at: rel.created_at,
                    updated_at: rel.updated_at
                };
            });
            
            return {
                clientes: clientesOrdenados,
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
     * @param {number} clienteId - ID del cliente
     * @param {number} funcionalidadId - redmine_id de la funcionalidad
     */
    static async actualizarEstado(clienteId, funcionalidadId, datos) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verificar si ya existe la relación
            const existeResult = await client.query(
                `
                SELECT id, estado_comercial
                FROM cliente_funcionalidad
                WHERE cliente_id = $1 AND funcionalidad_id = $2
                `,
                [clienteId, funcionalidadId]
            );

            let result;

            if (existeResult.rows.length === 0) {
                // No existe: crear relación
                result = await client.query(
                    `
                    INSERT INTO cliente_funcionalidad 
                        (cliente_id, funcionalidad_id, estado_comercial)
                    VALUES ($1, $2, $3)
                    RETURNING *
                    `,
                    [
                        clienteId,
                        funcionalidadId,
                        datos.estado_comercial || null
                    ]
                );
            } else {
                // Ya existe: actualizar solo estado_comercial y updated_at
                result = await client.query(
                    `
                    UPDATE cliente_funcionalidad
                    SET estado_comercial = $3,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE cliente_id = $1 AND funcionalidad_id = $2
                    RETURNING *
                    `,
                    [
                        clienteId,
                        funcionalidadId,
                        datos.estado_comercial || null
                    ]
                );
            }

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error al actualizar estado:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Eliminar relación cliente-funcionalidad
     * @param {number} clienteId - ID del cliente
     * @param {number} funcionalidadId - redmine_id de la funcionalidad
     */
    static async eliminarRelacion(clienteId, funcionalidadId) {
        try {
            const query = `
                DELETE FROM cliente_funcionalidad 
                WHERE cliente_id = $1 AND funcionalidad_id = $2
                RETURNING *
            `;
            const result = await pool.query(query, [clienteId, funcionalidadId]); // funcionalidadId es redmine_id
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
            
            // Funcionalidades productivas por cliente
            const queryProductivasPorCliente = `
                SELECT 
                    c.id,
                    c.nombre,
                    COUNT(cf.id) as cantidad_productivas
                FROM clientes c
                LEFT JOIN cliente_funcionalidad cf ON c.id = cf.cliente_id AND cf.estado_comercial = 'productivo'
                GROUP BY c.id, c.nombre
                HAVING COUNT(cf.id) > 0
                ORDER BY cantidad_productivas DESC
            `;
            const resultProductivas = await pool.query(queryProductivasPorCliente);
            
            // Top clientes con más funcionalidades productivas
            const queryTopClientes = `
                SELECT 
                    c.id,
                    c.nombre,
                    COUNT(cf.id) as cantidad_productivas
                FROM clientes c
                LEFT JOIN cliente_funcionalidad cf ON c.id = cf.cliente_id AND cf.estado_comercial = 'productivo'
                GROUP BY c.id, c.nombre
                HAVING COUNT(cf.id) > 0
                ORDER BY cantidad_productivas DESC
                LIMIT 5
            `;
            const resultTopClientes = await pool.query(queryTopClientes);
            
            return {
                por_estado: result.rows,
                total: resultTotal.rows[0].total,
                productivas_por_cliente: resultProductivas.rows,
                top_clientes: resultTopClientes.rows
            };
        } catch (error) {
            console.error('Error al obtener estadísticas del mapa:', error);
            throw error;
        }
    }

    /**
     * Crear nuevo cliente
     */
    static async crearCliente(datos) {
        try {
            const query = `
                INSERT INTO clientes (nombre, color)
                VALUES ($1, $2)
                RETURNING *
            `;
            const values = [
                datos.nombre,
                datos.color || '#0D5AA2'
            ];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error al crear cliente:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los clientes (incluyendo inactivos)
     */
    static async obtenerTodosLosClientes() {
        try {
            const query = 'SELECT * FROM clientes ORDER BY nombre';
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener clientes:', error);
            throw error;
        }
    }

    /**
     * Obtener clientes de una funcionalidad (por redmine_id) con estado "productivo"
     * Incluye la versión (campo version en cliente_funcionalidad)
     */
    static async obtenerClientesPorFuncionalidad(redmine_id) {
        try {
            const query = `
                SELECT 
                    c.id,
                    c.nombre,
                    cf.version
                FROM clientes c
                INNER JOIN cliente_funcionalidad cf ON c.id = cf.cliente_id
                WHERE cf.funcionalidad_id = $1 AND cf.estado_comercial = 'productivo'
                ORDER BY c.nombre
            `;
            const result = await pool.query(query, [redmine_id]);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener clientes por funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Actualizar versión de una relación cliente-funcionalidad (productivo en)
     * Si la relación no existe, la crea con estado_comercial actual (o NULL)
     */
    static async actualizarVersionClienteFuncionalidad(clienteId, funcionalidadId, version) {
        try {
            const query = `
                INSERT INTO cliente_funcionalidad (cliente_id, funcionalidad_id, version)
                VALUES ($1, $2, $3)
                ON CONFLICT (cliente_id, funcionalidad_id)
                DO UPDATE SET
                    version = EXCLUDED.version,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const result = await pool.query(query, [clienteId, funcionalidadId, version || null]);
            return result.rows[0];
        } catch (error) {
            console.error('Error al actualizar versión cliente-funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Agregar cliente a funcionalidad (productivo en)
     */
    static async agregarClienteAFuncionalidad(clienteId, redmineId, estadoComercial = null) {
        try {
            const query = `
                INSERT INTO cliente_funcionalidad (cliente_id, funcionalidad_id, estado_comercial)
                VALUES ($1, $2, $3)
                ON CONFLICT (cliente_id, funcionalidad_id) 
                DO UPDATE SET 
                    estado_comercial = $3,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const result = await pool.query(query, [clienteId, redmineId, estadoComercial]);
            return result.rows[0];
        } catch (error) {
            console.error('Error al agregar cliente a funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Eliminar cliente de funcionalidad
     */
    static async eliminarClienteDeFuncionalidad(clienteId, redmineId) {
        try {
            const query = `
                DELETE FROM cliente_funcionalidad 
                WHERE cliente_id = $1 AND funcionalidad_id = $2
                RETURNING *
            `;
            const result = await pool.query(query, [clienteId, redmineId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar cliente de funcionalidad:', error);
            throw error;
        }
    }

    /**
     * Obtener funcionalidades con más clientes
     */
    static async obtenerTopFuncionalidades(limite = 10) {
        try {
            const query = `
                SELECT 
                    v.redmine_id,
                    v.titulo,
                    f.titulo_personalizado,
                    f.seccion,
                    v.cliente AS sponsor,
                    COUNT(DISTINCT cf.cliente_id) as cantidad_clientes
                FROM v_funcionalidades_completas v
                LEFT JOIN funcionalidades f ON v.redmine_id = f.redmine_id
                LEFT JOIN cliente_funcionalidad cf ON v.redmine_id = cf.funcionalidad_id
                GROUP BY v.redmine_id, v.titulo, f.titulo_personalizado, f.seccion, v.cliente
                HAVING COUNT(DISTINCT cf.cliente_id) > 0
                ORDER BY cantidad_clientes DESC
                LIMIT $1
            `;
            const result = await pool.query(query, [limite]);
            return result.rows;
        } catch (error) {
            console.error('Error al obtener top funcionalidades:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los clientes_redmine únicos de redmine_funcionalidades y redmine_req_clientes
     */
    static async obtenerClientesRedmine() {
        try {
            const query = `
                SELECT DISTINCT cliente AS cliente_redmine
                FROM (
                    SELECT cliente FROM redmine_funcionalidades WHERE cliente IS NOT NULL AND cliente != ''
                    UNION
                    SELECT cliente FROM redmine_req_clientes WHERE cliente IS NOT NULL AND cliente != ''
                ) AS todos_clientes
                ORDER BY cliente_redmine ASC
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.cliente_redmine);
        } catch (error) {
            console.error('Error al obtener clientes Redmine:', error);
            throw error;
        }
    }

    /**
     * Obtener cliente_redmine asociados a un cliente
     */
    static async obtenerClienteRedminePorCliente(clienteId) {
        try {
            const query = `
                SELECT cliente_redmine
                FROM cliente_cliente_redmine
                WHERE cliente_id = $1
                ORDER BY cliente_redmine ASC
            `;
            const result = await pool.query(query, [clienteId]);
            return result.rows.map(row => row.cliente_redmine);
        } catch (error) {
            console.error('Error al obtener cliente_redmine por cliente:', error);
            throw error;
        }
    }

    /**
     * Agregar cliente_redmine a un cliente
     */
    static async agregarClienteRedmine(clienteId, clienteRedmine) {
        try {
            const query = `
                INSERT INTO cliente_cliente_redmine (cliente_id, cliente_redmine)
                VALUES ($1, $2)
                ON CONFLICT (cliente_id, cliente_redmine) DO NOTHING
                RETURNING *
            `;
            const result = await pool.query(query, [clienteId, clienteRedmine]);
            return result.rows[0];
        } catch (error) {
            console.error('Error al agregar cliente_redmine:', error);
            throw error;
        }
    }

    /**
     * Eliminar cliente_redmine de un cliente
     */
    static async eliminarClienteRedmine(clienteId, clienteRedmine) {
        try {
            const query = `
                DELETE FROM cliente_cliente_redmine
                WHERE cliente_id = $1 AND cliente_redmine = $2
                RETURNING *
            `;
            const result = await pool.query(query, [clienteId, clienteRedmine]);
            return result.rows[0];
        } catch (error) {
            console.error('Error al eliminar cliente_redmine:', error);
            throw error;
        }
    }

    /**
     * Actualizar todos los cliente_redmine de un cliente
     */
    static async actualizarClienteRedmine(clienteId, clientesRedmine) {
        try {
            // Iniciar transacción
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Eliminar todas las relaciones existentes
                await client.query(
                    'DELETE FROM cliente_cliente_redmine WHERE cliente_id = $1',
                    [clienteId]
                );

                // Insertar las nuevas relaciones
                if (clientesRedmine && clientesRedmine.length > 0) {
                    for (const clienteRedmine of clientesRedmine) {
                        if (clienteRedmine && clienteRedmine.trim()) {
                            await client.query(
                                'INSERT INTO cliente_cliente_redmine (cliente_id, cliente_redmine) VALUES ($1, $2)',
                                [clienteId, clienteRedmine.trim()]
                            );
                        }
                    }
                }

                await client.query('COMMIT');

                // Obtener las relaciones actualizadas
                return await this.obtenerClienteRedminePorCliente(clienteId);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error al actualizar cliente_redmine:', error);
            throw error;
        }
    }

    /**
     * Actualizar relaciones automáticas basadas en req. clientes con reventa "Si" y sponsor mapeado
     * Marca automáticamente como "interesado" las relaciones cliente-funcionalidad
     */
    static async actualizarRelacionesAutomaticas() {
        try {
            // Buscar req. clientes con reventa "Si" y sponsor (cf_92) mapeado
            // El sponsor puede ser el código del proyecto (identifier) o el cliente de redmine_funcionalidades
            const queryReqClientes = `
                SELECT DISTINCT
                    rc.cliente AS cliente_redmine,
                    rc.cf_92 AS sponsor,
                    rf.redmine_id AS funcionalidad_redmine_id
                FROM v_req_clientes_completos rc
                INNER JOIN redmine_funcionalidades rf ON (
                    TRIM(rc.cf_92) = TRIM(rf.cliente)
                    OR CAST(rf.redmine_id AS TEXT) = TRIM(rc.cf_92)
                )
                WHERE rc.cf_91 = 'Si'
                  AND rc.cf_92 IS NOT NULL
                  AND TRIM(rc.cf_92) != ''
                  AND rc.cliente IS NOT NULL
                  AND TRIM(rc.cliente) != ''
            `;
            
            const resultReqClientes = await pool.query(queryReqClientes);
            
            if (resultReqClientes.rows.length === 0) {
                return; // No hay req. clientes que cumplan los criterios
            }
            
            console.log(`🔄 Actualizando ${resultReqClientes.rows.length} relaciones automáticas basadas en req. clientes`);
            
            // Para cada req. cliente, crear/actualizar la relación
            for (const reqCliente of resultReqClientes.rows) {
                try {
                    // Buscar el cliente de la web desde el cliente_redmine
                    const queryClienteWeb = `
                        SELECT DISTINCT c.id AS cliente_id
                        FROM clientes c
                        INNER JOIN cliente_cliente_redmine ccr ON c.id = ccr.cliente_id
                        WHERE TRIM(ccr.cliente_redmine) = TRIM($1)
                        LIMIT 1
                    `;
                    
                    const resultClienteWeb = await pool.query(queryClienteWeb, [reqCliente.cliente_redmine]);
                    
                    if (resultClienteWeb.rows.length === 0) {
                        console.log(`⚠️ No se encontró cliente web para cliente_redmine: "${reqCliente.cliente_redmine}"`);
                        continue;
                    }
                    
                    const clienteId = resultClienteWeb.rows[0].cliente_id;
                    const funcionalidadId = reqCliente.funcionalidad_redmine_id;
                    
                    // Verificar si ya existe una relación
                    const queryRelacionExistente = `
                        SELECT estado_comercial
                        FROM cliente_funcionalidad
                        WHERE cliente_id = $1 AND funcionalidad_id = $2
                    `;
                    
                    const resultRelacionExistente = await pool.query(queryRelacionExistente, [clienteId, funcionalidadId]);
                    
                    // Solo crear/actualizar si no existe una relación o si está en NULL
                    // No sobrescribir relaciones manuales existentes (productivo, rechazado, etc.)
                    if (resultRelacionExistente.rows.length === 0) {
                        // Crear relación automática como "interesado"
                        await pool.query(`
                            INSERT INTO cliente_funcionalidad (cliente_id, funcionalidad_id, estado_comercial)
                            VALUES ($1, $2, 'interesado')
                        `, [clienteId, funcionalidadId]);
                        
                        console.log(`✅ Relación automática creada: Cliente ${clienteId} - Funcionalidad ${funcionalidadId} (interesado)`);
                    } else {
                        const estadoActual = resultRelacionExistente.rows[0].estado_comercial;
                        // Si la relación existe pero está en NULL, actualizarla a "interesado"
                        // No sobrescribir estados manuales (productivo, rechazado, etc.)
                        if (!estadoActual) {
                            await pool.query(`
                                UPDATE cliente_funcionalidad
                                SET estado_comercial = 'interesado',
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE cliente_id = $1 AND funcionalidad_id = $2
                            `, [clienteId, funcionalidadId]);
                            
                            console.log(`✅ Relación automática actualizada: Cliente ${clienteId} - Funcionalidad ${funcionalidadId} (interesado)`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error al procesar req. cliente con sponsor "${reqCliente.sponsor}":`, error.message);
                }
            }
        } catch (error) {
            console.error('Error al actualizar relaciones automáticas:', error);
            // No lanzar error para no interrumpir la obtención del mapa
        }
    }
}

module.exports = MapaModel;


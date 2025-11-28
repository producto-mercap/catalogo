const FuncionalidadModel = require('../models/FuncionalidadModel');

/**
 * Renderizar página de funcionalidades
 */
exports.index = async (req, res) => {
    try {
        const filtros = {
            busqueda: req.query.busqueda || '',
            seccion: req.query.seccion || '',
            secciones: req.query.secciones ? (Array.isArray(req.query.secciones) ? req.query.secciones : [req.query.secciones]) : [],
            sponsor: req.query.sponsor || '',
            sponsors: req.query.sponsors ? (Array.isArray(req.query.sponsors) ? req.query.sponsors : [req.query.sponsors]) : [],
            orden: req.query.orden || 'score_total',
            direccion: req.query.direccion || 'desc'
        };
        
        const vista = req.query.vista || 'lista'; // lista o tarjetas
        
        const funcionalidades = await FuncionalidadModel.obtenerTodas(filtros);
        const secciones = await FuncionalidadModel.obtenerSecciones();
        const sponsors = await FuncionalidadModel.obtenerSponsors();
        const estadisticas = await FuncionalidadModel.obtenerEstadisticas();
        
        res.render('pages/funcionalidades', {
            title: 'Funcionalidades',
            funcionalidades,
            secciones,
            sponsors,
            estadisticas,
            filtros,
            vista,
            activeMenu: 'funcionalidades',
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error('Error al cargar funcionalidades:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar las funcionalidades'
        });
    }
};

/**
 * Renderizar detalle de funcionalidad
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.detalle = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const funcionalidad = await FuncionalidadModel.obtenerPorId(id);
        
        if (!funcionalidad) {
            return res.status(404).render('pages/404', {
                title: 'Funcionalidad no encontrada'
            });
        }
        
        // Obtener clientes de esta funcionalidad (productivo en)
        const MapaModel = require('../models/MapaModel');
        const clientesFuncionalidad = await MapaModel.obtenerClientesPorFuncionalidad(id);
        const todosLosClientes = await MapaModel.obtenerTodosLosClientes();
        
        // Obtener código del proyecto desde Redmine si está disponible
        let proyectoCodigo = null;
        if (funcionalidad.redmine_id) {
            try {
                const REDMINE_URL = process.env.REDMINE_URL;
                const REDMINE_TOKEN = process.env.REDMINE_TOKEN;
                
                if (!REDMINE_URL || !REDMINE_TOKEN) {
                    console.warn('⚠️ REDMINE_URL o REDMINE_TOKEN no están configurados');
                } else {
                    const redmineIdStr = String(funcionalidad.redmine_id);
                    const esNumero = /^\d+$/.test(redmineIdStr);
                    
                    if (esNumero) {
                        // Es un ID de issue numérico, obtener el issue y extraer el identifier del proyecto
                        const baseUrl = REDMINE_URL.replace(/\/+$/, '');
                        const url = `${baseUrl}/issues/${funcionalidad.redmine_id}.json?key=${REDMINE_TOKEN}`;
                        
                        const response = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'User-Agent': 'Catalogo-NodeJS/1.0'
                            }
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            if (data.issue && data.issue.project && data.issue.project.identifier) {
                                proyectoCodigo = data.issue.project.identifier;
                                console.log(`✅ Código del proyecto obtenido desde issue ${funcionalidad.redmine_id}: "${proyectoCodigo}"`);
                            }
                        } else {
                            console.warn(`⚠️ Error HTTP al obtener issue ${funcionalidad.redmine_id}: ${response.status}`);
                        }
                    } else {
                        // Parece ser un identifier de proyecto, usarlo directamente
                        proyectoCodigo = redmineIdStr;
                        console.log(`✅ Usando redmine_id como identifier del proyecto: "${proyectoCodigo}"`);
                    }
                }
            } catch (error) {
                console.error('Error al obtener código del proyecto desde Redmine:', error);
                // Continuar sin el código del proyecto
            }
        }
        
        // Obtener req clientes por sponsor (cf_92 = código del proyecto)
        const ReqClientesModel = require('../models/ReqClientesModel');
        let reqClientesInteresados = [];
        if (proyectoCodigo) {
            try {
                console.log(`🔍 Buscando req clientes interesados para proyecto: "${proyectoCodigo}"`);
                reqClientesInteresados = await ReqClientesModel.obtenerPorSponsor(proyectoCodigo);
                console.log(`✅ Encontrados ${reqClientesInteresados.length} req clientes interesados`);
            } catch (error) {
                console.error('Error al obtener req clientes interesados:', error);
            }
        } else {
            console.log('⚠️ No se pudo obtener proyectoCodigo, no se buscarán req clientes interesados');
        }
        
        res.render('pages/funcionalidad-detalle', {
            title: funcionalidad.titulo_personalizado || funcionalidad.titulo || 'Funcionalidad',
            funcionalidad,
            clientesFuncionalidad,
            todosLosClientes,
            proyectoCodigo,
            reqClientesInteresados,
            activeMenu: 'funcionalidades',
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error('Error al cargar detalle:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar el detalle'
        });
    }
};

/**
 * Renderizar formulario de nueva funcionalidad
 * NOTA: Las funcionalidades se crean automáticamente desde la sincronización con Redmine
 * Redirigir a la lista de funcionalidades
 */
exports.nuevoFormulario = async (req, res) => {
    res.redirect('/funcionalidades');
};

/**
 * Renderizar formulario de edición
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.editarFormulario = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const funcionalidad = await FuncionalidadModel.obtenerPorId(id);
        
        if (!funcionalidad) {
            return res.status(404).render('pages/404', {
                title: 'Funcionalidad no encontrada'
            });
        }
        
        const secciones = await FuncionalidadModel.obtenerSecciones();
        
        res.render('pages/funcionalidad-form', {
            title: 'Editar Funcionalidad',
            funcionalidad,
            secciones,
            activeMenu: 'funcionalidades'
        });
    } catch (error) {
        console.error('Error al cargar formulario:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar el formulario'
        });
    }
};

/**
 * Crear funcionalidad
 * Permite crear funcionalidades manualmente (sin redmine_id) o actualizar si viene redmine_id
 */
exports.crear = async (req, res) => {
    try {
        // Si viene redmine_id, actualizar campos editables
        if (req.body.redmine_id) {
            const datos = {
                descripcion: req.body.descripcion,
                seccion: req.body.seccion,
                monto: req.body.monto ? parseFloat(req.body.monto) : null
            };
            
            const funcionalidad = await FuncionalidadModel.actualizar(req.body.redmine_id, datos);
            
            if (!funcionalidad) {
                return res.status(404).json({
                    success: false,
                    error: 'Funcionalidad no encontrada. Asegúrate de que el issue esté sincronizado desde Redmine.'
                });
            }
            
            return res.json({
                success: true,
                funcionalidad,
                message: 'Funcionalidad actualizada exitosamente'
            });
        }
        
        // Crear funcionalidad manualmente (puede incluir datos de Redmine)
        const datos = {
            titulo: req.body.titulo || 'Nueva funcionalidad',
            titulo_personalizado: req.body.titulo_personalizado || req.body.titulo || 'Nueva funcionalidad',
            descripcion: req.body.descripcion || null,
            seccion: req.body.seccion || null,
            monto: req.body.monto ? parseFloat(req.body.monto) : null,
            // Datos de Redmine
            redmine_id: req.body.redmine_id || null,
            proyecto: req.body.proyecto || null,
            sponsor: req.body.sponsor || null,
            reventa: req.body.reventa || null,
            fecha_creacion: req.body.fecha_creacion || null,
            total_spent_hours: req.body.total_spent_hours ? parseFloat(req.body.total_spent_hours) : null
        };
        
        if (!datos.titulo) {
            return res.status(400).json({
                success: false,
                error: 'El título es requerido'
            });
        }
        
        const funcionalidad = await FuncionalidadModel.crearManual(datos);
        
        res.json({
            success: true,
            funcionalidad,
            message: 'Funcionalidad creada exitosamente'
        });
    } catch (error) {
        console.error('Error al crear funcionalidad:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al crear la funcionalidad'
        });
    }
};

/**
 * Actualizar funcionalidad (solo campos editables)
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.actualizar = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const datos = {
            descripcion: req.body.descripcion,
            seccion: req.body.seccion,
            monto: req.body.monto ? parseFloat(req.body.monto) : null,
            titulo_personalizado: req.body.titulo_personalizado || null
        };
        
        const funcionalidad = await FuncionalidadModel.actualizar(id, datos);
        
        if (!funcionalidad) {
            return res.status(404).json({
                success: false,
                error: 'Funcionalidad no encontrada'
            });
        }
        
        res.json({
            success: true,
            funcionalidad,
            message: 'Funcionalidad actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar funcionalidad:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar la funcionalidad'
        });
    }
};

/**
 * Eliminar funcionalidad
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.eliminar = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const funcionalidad = await FuncionalidadModel.eliminar(id);
        
        if (!funcionalidad) {
            return res.status(404).json({
                success: false,
                error: 'Funcionalidad no encontrada'
            });
        }
        
        res.json({
            success: true,
            message: 'Funcionalidad eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar funcionalidad:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar la funcionalidad'
        });
    }
};

/**
 * Obtener clientes de una funcionalidad
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.obtenerClientes = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const MapaModel = require('../models/MapaModel');
        const clientes = await MapaModel.obtenerClientesPorFuncionalidad(id);
        
        res.json({
            success: true,
            clientes
        });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los clientes'
        });
    }
};


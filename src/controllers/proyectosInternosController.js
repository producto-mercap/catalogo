const ProyectosInternosModel = require('../models/ProyectosInternosModel');

const buildRedmineBaseUrl = () => {
    const base = process.env.REDMINE_PUBLIC_URL || process.env.REDMINE_URL || 'https://redmine.mercap.net';
    return base.replace(/\/+$/, '');
};

/**
 * Renderizar página de proyectos internos
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
        
        const vista = req.query.vista || 'lista';
        
        const proyectos = await ProyectosInternosModel.obtenerTodas(filtros);
        const secciones = await ProyectosInternosModel.obtenerSecciones();
        const estadisticas = await ProyectosInternosModel.obtenerEstadisticas();
        
        res.render('pages/backlog-proyectos', {
            title: 'Proyectos Internos',
            proyectos,
            secciones,
            estadisticas,
            filtros,
            vista,
            activeMenu: 'proyectos-internos',
            isAdmin: req.isAdmin || false,
            redmineBaseUrl: buildRedmineBaseUrl()
        });
    } catch (error) {
        console.error('Error al cargar proyectos internos:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar los proyectos internos'
        });
    }
};

/**
 * Renderizar detalle de proyecto interno
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.detalle = async (req, res) => {
    try {
        const { id } = req.params;
        const proyecto = await ProyectosInternosModel.obtenerPorId(id);
        
        if (!proyecto) {
            return res.status(404).render('pages/404', {
                title: 'Proyecto no encontrado'
            });
        }
        
        res.render('pages/backlog-proyecto-detalle', {
            title: proyecto.titulo,
            proyecto,
            activeMenu: 'proyectos-internos',
            isAdmin: req.isAdmin || false,
            redmineBaseUrl: buildRedmineBaseUrl()
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
 * Redirigir a la lista (los proyectos se crean desde Redmine)
 */
exports.nuevoFormulario = async (req, res) => {
    res.redirect('/proyectos-internos');
};

/**
 * Renderizar formulario de edición
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.editarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
        const proyecto = await ProyectosInternosModel.obtenerPorId(id);
        
        if (!proyecto) {
            return res.status(404).render('pages/404', {
                title: 'Proyecto no encontrado'
            });
        }
        
        const secciones = await ProyectosInternosModel.obtenerSecciones();
        
        res.render('pages/backlog-proyecto-form', {
            title: 'Editar Proyecto Interno',
            proyecto,
            secciones,
            activeMenu: 'proyectos-internos'
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
 * Crear proyecto (en realidad actualiza si existe redmine_id)
 */
exports.crear = async (req, res) => {
    try {
        if (!req.body.redmine_id) {
            return res.status(400).json({
                success: false,
                error: 'Los proyectos deben crearse desde la sincronización con Redmine. Use el endpoint de actualización para editar campos.'
            });
        }
        
        const datos = {
            descripcion: req.body.descripcion,
            seccion: req.body.seccion
        };
        
        const proyecto = await ProyectosInternosModel.actualizar(req.body.redmine_id, datos);
        
        if (!proyecto) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto no encontrado. Asegúrate de que el issue esté sincronizado desde Redmine.'
            });
        }
        
        res.json({
            success: true,
            proyecto,
            message: 'Proyecto interno actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear proyecto interno:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al crear el proyecto interno'
        });
    }
};

/**
 * Actualizar proyecto (solo campos editables)
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const datos = {
            descripcion: req.body.descripcion,
            seccion: req.body.seccion
        };
        
        const proyecto = await ProyectosInternosModel.actualizar(id, datos);
        
        if (!proyecto) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto no encontrado'
            });
        }
        
        res.json({
            success: true,
            proyecto,
            message: 'Proyecto interno actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar proyecto interno:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el proyecto interno'
        });
    }
};

/**
 * Eliminar proyecto interno
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.eliminar = async (req, res) => {
    try {
        const { id } = req.params;
        const proyecto = await ProyectosInternosModel.eliminar(id);
        
        if (!proyecto) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Proyecto interno eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar proyecto interno:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el proyecto interno'
        });
    }
};



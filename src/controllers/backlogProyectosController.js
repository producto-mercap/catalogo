const BacklogProyectosModel = require('../models/BacklogProyectosModel');

/**
 * Renderizar página de backlog de proyectos
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
        
        const proyectos = await BacklogProyectosModel.obtenerTodas(filtros);
        const secciones = await BacklogProyectosModel.obtenerSecciones();
        const sponsors = await BacklogProyectosModel.obtenerSponsors();
        const estadisticas = await BacklogProyectosModel.obtenerEstadisticas();
        
        res.render('pages/backlog-proyectos', {
            title: 'Backlog Proyectos',
            proyectos,
            secciones,
            sponsors,
            estadisticas,
            filtros,
            vista,
            activeMenu: 'backlog-proyectos'
        });
    } catch (error) {
        console.error('Error al cargar backlog de proyectos:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar el backlog de proyectos'
        });
    }
};

/**
 * Renderizar detalle de proyecto
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.detalle = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const proyecto = await BacklogProyectosModel.obtenerPorId(id);
        
        if (!proyecto) {
            return res.status(404).render('pages/404', {
                title: 'Proyecto no encontrado'
            });
        }
        
        res.render('pages/backlog-proyecto-detalle', {
            title: proyecto.titulo,
            proyecto,
            activeMenu: 'backlog-proyectos'
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
 * Renderizar formulario de nuevo proyecto
 * NOTA: Los proyectos se crean automáticamente desde la sincronización con Redmine
 * Redirigir a la lista de proyectos
 */
exports.nuevoFormulario = async (req, res) => {
    res.redirect('/backlog-proyectos');
};

/**
 * Renderizar formulario de edición
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.editarFormulario = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const proyecto = await BacklogProyectosModel.obtenerPorId(id);
        
        if (!proyecto) {
            return res.status(404).render('pages/404', {
                title: 'Proyecto no encontrado'
            });
        }
        
        const secciones = await BacklogProyectosModel.obtenerSecciones();
        
        res.render('pages/backlog-proyecto-form', {
            title: 'Editar Proyecto',
            proyecto,
            secciones,
            activeMenu: 'backlog-proyectos'
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
 * Crear proyecto
 * NOTA: Los proyectos se crean automáticamente desde la sincronización con Redmine
 * Este endpoint solo actualiza campos editables si viene redmine_id
 */
exports.crear = async (req, res) => {
    try {
        if (!req.body.redmine_id) {
            return res.status(400).json({
                success: false,
                error: 'Los proyectos deben crearse desde la sincronización con Redmine. Use el endpoint de actualización para editar campos.'
            });
        }
        
        // Si viene redmine_id, actualizar campos editables
        const datos = {
            descripcion: req.body.descripcion,
            seccion: req.body.seccion,
            monto: req.body.monto ? parseFloat(req.body.monto) : null
        };
        
        const proyecto = await BacklogProyectosModel.actualizar(req.body.redmine_id, datos);
        
        if (!proyecto) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto no encontrado. Asegúrate de que el issue esté sincronizado desde Redmine.'
            });
        }
        
        res.json({
            success: true,
            proyecto,
            message: 'Proyecto actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear proyecto:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al crear el proyecto'
        });
    }
};

/**
 * Actualizar proyecto (solo campos editables)
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.actualizar = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const datos = {
            descripcion: req.body.descripcion,
            seccion: req.body.seccion,
            monto: req.body.monto ? parseFloat(req.body.monto) : null
        };
        
        const proyecto = await BacklogProyectosModel.actualizar(id, datos);
        
        if (!proyecto) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto no encontrado'
            });
        }
        
        res.json({
            success: true,
            proyecto,
            message: 'Proyecto actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar proyecto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el proyecto'
        });
    }
};

/**
 * Eliminar proyecto
 * @param {number} redmine_id - ID del issue en Redmine
 */
exports.eliminar = async (req, res) => {
    try {
        const { id } = req.params; // Este es el redmine_id ahora
        const proyecto = await BacklogProyectosModel.eliminar(id);
        
        if (!proyecto) {
            return res.status(404).json({
                success: false,
                error: 'Proyecto no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Proyecto eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar proyecto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el proyecto'
        });
    }
};



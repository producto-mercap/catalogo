const FuncionalidadModel = require('../models/FuncionalidadModel');

/**
 * Renderizar página de funcionalidades
 */
exports.index = async (req, res) => {
    try {
        const filtros = {
            busqueda: req.query.busqueda || '',
            seccion: req.query.seccion || '',
            orden: req.query.orden || 'created_at',
            direccion: req.query.direccion || 'desc'
        };
        
        const vista = req.query.vista || 'lista'; // lista o tarjetas
        
        const funcionalidades = await FuncionalidadModel.obtenerTodas(filtros);
        const secciones = await FuncionalidadModel.obtenerSecciones();
        const estadisticas = await FuncionalidadModel.obtenerEstadisticas();
        
        res.render('pages/funcionalidades', {
            title: 'Funcionalidades',
            funcionalidades,
            secciones,
            estadisticas,
            filtros,
            vista,
            activeMenu: 'funcionalidades'
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
 */
exports.detalle = async (req, res) => {
    try {
        const { id } = req.params;
        const funcionalidad = await FuncionalidadModel.obtenerPorId(id);
        
        if (!funcionalidad) {
            return res.status(404).render('pages/404', {
                title: 'Funcionalidad no encontrada'
            });
        }
        
        res.render('pages/funcionalidad-detalle', {
            title: funcionalidad.titulo,
            funcionalidad,
            activeMenu: 'funcionalidades'
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
 */
exports.nuevoFormulario = async (req, res) => {
    try {
        const secciones = await FuncionalidadModel.obtenerSecciones();
        res.render('pages/funcionalidad-form', {
            title: 'Nueva Funcionalidad',
            funcionalidad: null,
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
 * Renderizar formulario de edición
 */
exports.editarFormulario = async (req, res) => {
    try {
        const { id } = req.params;
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
 */
exports.crear = async (req, res) => {
    try {
        const datos = {
            titulo: req.body.titulo,
            descripcion: req.body.descripcion,
            sponsor: req.body.sponsor,
            epic_redmine: req.body.epic_redmine,
            productivo_en: req.body.productivo_en || null,
            seccion: req.body.seccion,
            monto: parseFloat(req.body.monto) || 0
        };
        
        // Validación básica
        if (!datos.titulo) {
            return res.status(400).json({
                success: false,
                error: 'El título es requerido'
            });
        }
        
        const funcionalidad = await FuncionalidadModel.crear(datos);
        
        res.json({
            success: true,
            funcionalidad,
            message: 'Funcionalidad creada exitosamente'
        });
    } catch (error) {
        console.error('Error al crear funcionalidad:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear la funcionalidad'
        });
    }
};

/**
 * Actualizar funcionalidad
 */
exports.actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const datos = {
            titulo: req.body.titulo,
            descripcion: req.body.descripcion,
            sponsor: req.body.sponsor,
            epic_redmine: req.body.epic_redmine,
            productivo_en: req.body.productivo_en || null,
            seccion: req.body.seccion,
            monto: parseFloat(req.body.monto) || 0
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
 */
exports.eliminar = async (req, res) => {
    try {
        const { id } = req.params;
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


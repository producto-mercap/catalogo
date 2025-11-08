const MapaModel = require('../models/MapaModel');

/**
 * Renderizar página del mapa
 */
exports.index = async (req, res) => {
    try {
        const mapa = await MapaModel.obtenerMapa();
        const estadisticas = await MapaModel.obtenerEstadisticas();
        const topFuncionalidades = await MapaModel.obtenerTopFuncionalidades(5);
        
        res.render('pages/mapa', {
            title: 'Mapa de Clientes y Funcionalidades',
            clientes: mapa.clientes,
            funcionalidades: mapa.funcionalidades,
            relaciones: mapa.relaciones,
            estadisticas,
            topFuncionalidades,
            activeMenu: 'mapa'
        });
    } catch (error) {
        console.error('Error al cargar mapa:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar el mapa'
        });
    }
};

/**
 * Actualizar estado comercial
 */
exports.actualizarEstado = async (req, res) => {
    try {
        const { clienteId, funcionalidadId } = req.params;
        
        const datos = {
            estado_comercial: req.body.estado_comercial,
            fecha_inicio: req.body.fecha_inicio || null,
            fecha_fin: req.body.fecha_fin || null,
            notas: req.body.notas || null
        };
        
        // Validar estado comercial
        const estadosValidos = ['En Desarrollo', 'Implementado', 'Planificado', 'Cancelado'];
        if (!estadosValidos.includes(datos.estado_comercial)) {
            return res.status(400).json({
                success: false,
                error: 'Estado comercial inválido'
            });
        }
        
        const relacion = await MapaModel.actualizarEstado(clienteId, funcionalidadId, datos);
        
        res.json({
            success: true,
            relacion,
            message: 'Estado actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el estado'
        });
    }
};

/**
 * Eliminar relación
 */
exports.eliminarRelacion = async (req, res) => {
    try {
        const { clienteId, funcionalidadId } = req.params;
        
        const relacion = await MapaModel.eliminarRelacion(clienteId, funcionalidadId);
        
        if (!relacion) {
            return res.status(404).json({
                success: false,
                error: 'Relación no encontrada'
            });
        }
        
        res.json({
            success: true,
            message: 'Relación eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar relación:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar la relación'
        });
    }
};

/**
 * Obtener datos del mapa en formato JSON
 */
exports.obtenerDatos = async (req, res) => {
    try {
        const mapa = await MapaModel.obtenerMapa();
        
        res.json({
            success: true,
            clientes: mapa.clientes,
            funcionalidades: mapa.funcionalidades,
            relaciones: mapa.relaciones
        });
    } catch (error) {
        console.error('Error al obtener datos del mapa:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los datos'
        });
    }
};


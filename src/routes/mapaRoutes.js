const express = require('express');
const router = express.Router();
const mapaController = require('../controllers/mapaController');

// Vistas
router.get('/', mapaController.index);

// API
router.get('/datos', mapaController.obtenerDatos);
router.put('/estado/:clienteId/:funcionalidadId', mapaController.actualizarEstado);
router.delete('/relacion/:clienteId/:funcionalidadId', mapaController.eliminarRelacion);

module.exports = router;


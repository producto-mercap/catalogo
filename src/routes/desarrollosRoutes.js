const express = require('express');
const router = express.Router();
const backlogProyectosController = require('../controllers/backlogProyectosController');

// Vistas
router.get('/', backlogProyectosController.index);
router.get('/nuevo', backlogProyectosController.nuevoFormulario);
router.get('/:id', backlogProyectosController.detalle);
router.get('/:id/editar', backlogProyectosController.editarFormulario);

// API
router.post('/', backlogProyectosController.crear);
router.put('/:id', backlogProyectosController.actualizar);
router.delete('/:id', backlogProyectosController.eliminar);

module.exports = router;













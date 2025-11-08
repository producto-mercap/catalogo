const express = require('express');
const router = express.Router();
const scoreController = require('../controllers/scoreController');

// Vistas
router.get('/', scoreController.index);
router.get('/calculadora/:id', scoreController.calculadora);

// API
router.put('/:id', scoreController.actualizar);
router.put('/:id/pesos', scoreController.actualizarPesos);
router.post('/calcular-preview', scoreController.calcularPreview);

module.exports = router;


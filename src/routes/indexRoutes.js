const express = require('express');
const router = express.Router();

// Ruta principal - redirigir a funcionalidades
router.get('/', (req, res) => {
    res.redirect('/funcionalidades');
});

module.exports = router;


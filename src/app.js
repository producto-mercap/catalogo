// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();

// Configuración de vistas (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para parsear JSON y form data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rutas
const indexRoutes = require('./routes/indexRoutes');
const funcionalidadesRoutes = require('./routes/funcionalidadesRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const mapaRoutes = require('./routes/mapaRoutes');
const apiRoutes = require('./routes/apiRoutes');

app.use('/', indexRoutes);
app.use('/funcionalidades', funcionalidadesRoutes);
app.use('/score', scoreRoutes);
app.use('/mapa', mapaRoutes);
app.use('/api', apiRoutes);

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('pages/404', {
        title: '404 - Página no encontrada'
    });
});

// Manejo de errores del servidor
app.use((err, req, res, next) => {
    console.error('Error del servidor:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Ha ocurrido un error'
    });
});

// Iniciar servidor solo en desarrollo (Vercel maneja producción)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📁 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
}

// Exportar app para Vercel (serverless)
module.exports = app;


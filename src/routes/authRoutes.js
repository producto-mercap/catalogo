const express = require('express');
const router = express.Router();
const { generateToken, verifyToken } = require('../middleware/authJWT');

const HARDCODED_PASSWORD = 'MPmercap767';

/**
 * Renderizar página de login
 */
router.get('/', (req, res) => {
    // Verificar si ya está autenticado con JWT
    const cookieHeader = req.headers.cookie || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    
    if (token) {
        const verification = verifyToken(token);
        if (verification.valid) {
            return res.redirect('/funcionalidades');
        }
    }
    
    res.render('pages/login', {
        title: 'Login - Catálogo'
    });
});

/**
 * Procesar login
 */
router.post('/', (req, res) => {
    const { password } = req.body;
    
    if (password === HARDCODED_PASSWORD) {
        // Generar token JWT
        const token = generateToken();
        
        // Establecer cookie con el token
        const isSecure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 horas
            path: '/'
        });
        
        if (process.env.DEBUG_SESSIONS === 'true' || process.env.NODE_ENV === 'production') {
            console.log('✅ Login exitoso - Token JWT generado y cookie establecida');
        }
        
        // Redirigir a funcionalidades
        res.redirect('/funcionalidades');
    } else {
        if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SESSIONS === 'true') {
            console.log('❌ Login fallido - Contraseña incorrecta');
        }
        res.render('pages/login', {
            title: 'Login - Catálogo',
            error: 'Contraseña incorrecta'
        });
    }
});

/**
 * Logout
 */
router.post('/logout', (req, res) => {
    // Limpiar cookie de autenticación
    res.clearCookie('auth_token');
    res.redirect('/login');
});

module.exports = router;


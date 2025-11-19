/**
 * Controlador para Ideas/Mejoras
 * Esta sección está en desarrollo
 */

/**
 * Renderizar página de Ideas/Mejoras
 */
exports.index = async (req, res) => {
    try {
        res.render('pages/ideas-mejoras', {
            title: 'Ideas/Mejoras',
            activeMenu: 'ideas-mejoras',
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error('Error al cargar Ideas/Mejoras:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Error al cargar Ideas/Mejoras'
        });
    }
};


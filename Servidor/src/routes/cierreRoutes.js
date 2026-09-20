const express = require('express');
const router = express.Router();
const cierreController = require('../controllers/cierreController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Proteger todas las rutas con el token JWT
router.use(verificarToken);

// Endpoint: POST /api/v1/cierres
router.post(
    '/', 
    verificarRol(['Administrador', 'Auditor', 'Despachador']), 
    cierreController.registrarCierreDiario
);

module.exports = router;
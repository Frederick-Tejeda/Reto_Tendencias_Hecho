const express = require('express');
const router = express.Router();
const despachosController = require('../controllers/despachosController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// Endpoint: POST /api/v1/despachos/validar-qr
router.post(
    '/validar-qr', 
    verificarRol(['Despachador', 'Administrador']), 
    despachosController.registrarDespacho
);

module.exports = router;
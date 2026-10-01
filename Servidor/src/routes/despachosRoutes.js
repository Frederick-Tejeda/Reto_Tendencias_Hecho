const express = require('express');
const router = express.Router();
const despachosController = require('../controllers/despachosController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken);
router.use(verificarRol(['Despachador'])); // Solo despachadores pueden acceder a estas rutas


// Validación previa para mostrar datos en pantalla (RF-12, RF-13)
router.post(
    '/validate', 
    verificarRol(['Despachador', 'Audiencia']),
    despachosController.validarTicketQR
);

router.post(
    '/', 
    verificarRol(['Despachador']),
    despachosController.registrarDespacho
);

module.exports = router;
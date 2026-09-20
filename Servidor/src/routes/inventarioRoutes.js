const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// Endpoint: POST /api/v1/inventario/recepcion
router.post(
    '/recepcion', 
    verificarRol(['Administrador', 'Supervisor']), 
    inventarioController.registrarRecepcion
);

// Endpoint: POST /api/v1/inventario/ajuste
router.post(
    '/ajuste', 
    verificarRol(['Administrador', 'Auditor']), 
    inventarioController.registrarAjuste
);

module.exports = router;
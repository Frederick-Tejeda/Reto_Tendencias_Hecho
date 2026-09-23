const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.post(
    '/receive', 
    verificarRol(['Administrador', 'Supervisor']), 
    inventarioController.registrarRecepcion
);

router.post(
    '/adjust', 
    verificarRol(['Administrador', 'Auditor']), 
    inventarioController.ajustarInventario
);

router.get(
    '/status', 
    verificarRol(['Administrador', 'Supervisor', 'Auditor']), 
    inventarioController.consultarEstadoInventario
);

router.get(
    '/movements', 
    verificarRol(['Administrador', 'Supervisor', 'Auditor']), 
    inventarioController.listarMovimientos
);

module.exports = router;
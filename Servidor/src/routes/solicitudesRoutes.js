const express = require('express');
const router = express.Router();
const solicitudesController = require('../controllers/solicitudesController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Todo requiere autenticación
router.use(verificarToken);

router.post(
    '/', 
    verificarRol(['Administrador', 'Supervisor', 'Solicitante']), 
    solicitudesController.crearSolicitud
);

router.get(
    '/', 
    verificarRol(['Supervisor', 'Administrador', 'Solicitante', 'Audiencia']), 
    solicitudesController.listarSolicitudes
);

router.get(
    '/pendientes', 
    verificarRol(['Supervisor', 'Audiencia', 'Solicitante']), 
    solicitudesController.obtenerSolicitudesPendientes
);

module.exports = router;
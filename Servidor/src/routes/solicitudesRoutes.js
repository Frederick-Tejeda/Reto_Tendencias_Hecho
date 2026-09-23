const express = require('express');
const router = express.Router();
const solicitudesController = require('../controllers/solicitudesController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Todo requiere autenticación
router.use(verificarToken);

// Crear solicitud: Permitido para Administradores, Supervisores y Despachadores (o el rol que definas como solicitante operativo)
router.post(
    '/', 
    verificarRol(['Administrador', 'Supervisor', 'Despachador']), 
    solicitudesController.crearSolicitud
);

// Crear solicitud: Permitido para Administradores, Supervisores y Despachadores (o el rol que definas como solicitante operativo)
router.get(
    '/', 
    verificarRol(['Administrador', 'Supervisor', 'Despachador']), 
    solicitudesController.listarSolicitudes
);

// Ver solicitudes pendientes: Solo para quienes aprueban
router.get(
    '/pendientes', 
    verificarRol(['Administrador', 'Supervisor']), 
    solicitudesController.obtenerSolicitudesPendientes
);

module.exports = router;
const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/ticketsController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// Aprobar solicitud y generar ticket
// Endpoint: POST /api/v1/tickets/aprobar/:id_solicitud
router.post(
    '/aprobar/:id_solicitud', 
    verificarRol(['Administrador', 'Supervisor']), 
    ticketsController.aprobarSolicitud
);

module.exports = router;
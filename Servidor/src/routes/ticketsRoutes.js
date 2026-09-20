const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/ticketsController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Validar auth general
router.use(verificarToken);

// Solicitudes
router.post('/requests', ticketsController.crearSolicitud);
router.get('/requests', ticketsController.listarSolicitudes);
router.post('/assignments/process-auto', ticketsController.procesarAsignacionesAutomaticas);

// Tickets
router.post('/tickets/issue', ticketsController.emitirTicket);
router.get('/tickets', ticketsController.listarTickets);
router.put('/tickets/:uuid/cancel', ticketsController.anularTicket);

module.exports = router;
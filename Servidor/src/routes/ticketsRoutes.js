const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/ticketsController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Validar auth general
router.use(verificarToken);

router.post('/issue', verificarRol(['Supervisor']), ticketsController.emitirTicket);
router.get('/', verificarRol(['Supervisor', 'Audiencia', 'Solicitante']), ticketsController.listarTickets);
router.get('/:idEmpleado', ticketsController.listarTicketPorIdEmpleado);
router.put('/:uuid/cancel', verificarRol(['Supervisor']), ticketsController.anularTicket);

module.exports = router;
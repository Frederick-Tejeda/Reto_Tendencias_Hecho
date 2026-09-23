const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/ticketsController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Validar auth general
router.use(verificarToken);

router.post('/issue', ticketsController.emitirTicket);
router.get('/', ticketsController.listarTickets);
router.put('/:uuid/cancel', ticketsController.anularTicket);

module.exports = router;
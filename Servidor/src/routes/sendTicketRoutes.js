const express = require('express');
const router = express.Router();
const { enviarTicket } = require('../controllers/enviarTicketController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos

router.post('/ticket/:ticketId', enviarTicket);

module.exports = router;
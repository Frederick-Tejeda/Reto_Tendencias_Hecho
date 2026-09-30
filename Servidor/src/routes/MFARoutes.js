const express = require('express');
const router = express.Router();
const { generarMFA, validarMFA } = require('../controllers/MFAController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos

router.get('/generate', generarMFA);
router.post('/validate', validarMFA);

module.exports = router;
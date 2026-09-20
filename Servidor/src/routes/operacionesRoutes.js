const express = require('express');
const router = express.Router();
const operacionesController = require('../controllers/operacionesController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// Despacho móvil o web
router.post('/dispatch', operacionesController.procesarDespacho);

// Operaciones de inventario
router.post('/inventory/receive', operacionesController.recibirCombustible);
router.post('/inventory/adjust', operacionesController.ajustarInventario);
router.get('/inventory/status', operacionesController.consultarInventario);
router.get('/inventory/movements', operacionesController.listarMovimientos);

module.exports = router;
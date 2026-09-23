const express = require('express');
const router = express.Router();
const vehiculesController = require('../controllers/vehiculesController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos

router.post('/vehicles', vehiculesController.crearVehiculo);
router.get('/vehicles', vehiculesController.listarVehiculos);
router.put('/vehicles/:id', vehiculesController.modificarVehiculo);

module.exports = router;
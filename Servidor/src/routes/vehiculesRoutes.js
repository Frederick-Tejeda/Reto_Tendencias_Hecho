const express = require('express');
const router = express.Router();
const vehiculesController = require('../controllers/vehiculesController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos

router.post('/', vehiculesController.crearVehiculo);
router.get('/', vehiculesController.listarVehiculos);
router.put('/:id', vehiculesController.modificarVehiculo);

module.exports = router;
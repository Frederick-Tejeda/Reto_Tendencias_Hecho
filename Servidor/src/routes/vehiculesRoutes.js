const express = require('express');
const router = express.Router();
const vehiculesController = require('../controllers/vehiculesController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos

router.post('/', verificarRol(['Administrador']), vehiculesController.crearVehiculo);
router.get('/', verificarRol(['Administrador', 'Supervisor', 'Solicitante']), vehiculesController.listarVehiculos);
router.put('/:id', verificarRol(['Administrador']), vehiculesController.modificarVehiculo);

module.exports = router;
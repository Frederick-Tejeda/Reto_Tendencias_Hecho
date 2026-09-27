const express = require('express');
const router = express.Router();
const vehiculesController = require('../controllers/vehiculesController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos
router.use(verificarRol(['Administrador'])); // Asumiendo que solo administradores pueden crear/modificar vehiculos

router.post('/', vehiculesController.crearVehiculo);
router.get('/', vehiculesController.listarVehiculos);
router.put('/:id', vehiculesController.modificarVehiculo);

module.exports = router;
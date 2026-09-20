const express = require('express');
const router = express.Router();
const catalogosController = require('../controllers/catalogosController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos

// Departamentos
router.post('/departments', catalogosController.crearDepartamento);
router.get('/departments', catalogosController.listarDepartamentos);
router.put('/departments/:id', catalogosController.modificarDepartamento);

// Empleados
router.post('/employees', catalogosController.crearEmpleado);
router.get('/employees', catalogosController.listarEmpleados);
router.put('/employees/:id', catalogosController.modificarEmpleado);

// Vehículos
router.post('/vehicles', catalogosController.crearVehiculo);
router.get('/vehicles', catalogosController.listarVehiculos);
router.put('/vehicles/:id', catalogosController.modificarVehiculo);

module.exports = router;
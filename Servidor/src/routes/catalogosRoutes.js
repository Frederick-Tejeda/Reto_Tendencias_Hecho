const express = require('express');
const router = express.Router();
const catalogosController = require('../controllers/catalogosController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Aplicamos protección global a todas las rutas de este archivo
router.use(verificarToken);
router.use(verificarRol(['Administrador'])); // Solo los admins pueden crear catálogos

// Endpoints de creación
router.post('/departamentos', catalogosController.crearDepartamento);
router.post('/empleados', catalogosController.crearEmpleado);
router.post('/vehiculos', catalogosController.crearVehiculo);

module.exports = router;
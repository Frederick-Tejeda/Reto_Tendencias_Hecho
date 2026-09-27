const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employeesController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos
router.use(verificarRol(['Administrador'])); // Asumiendo que solo administradores pueden crear/modificar empleados

router.post('/', employeesController.crearEmpleado);
router.get('/', employeesController.listarEmpleados);
router.put('/:id', employeesController.modificarEmpleado);

module.exports = router;
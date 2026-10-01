const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employeesController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos

router.post('/', verificarRol(['Administrador']), employeesController.crearEmpleado);
router.get('/', verificarRol(['Administrador', 'Supervisor', 'Solicitante', 'Audiencia']), employeesController.listarEmpleados);
router.put('/:id', verificarRol(['Administrador']), employeesController.modificarEmpleado);

module.exports = router;
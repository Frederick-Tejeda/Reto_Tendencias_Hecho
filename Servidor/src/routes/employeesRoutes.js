const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employeesController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos

router.post('/employees', employeesController.crearEmpleado);
router.get('/employees', employeesController.listarEmpleados);
router.put('/employees/:id', employeesController.modificarEmpleado);

module.exports = router;
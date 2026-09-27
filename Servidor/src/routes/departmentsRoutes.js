const express = require('express');
const router = express.Router();
const departmentsController = require('../controllers/departmentsController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken);
router.use(verificarRol(['Administrador'])); // Asumiendo que solo administradores pueden crear/modificar departamentos

router.post('/', departmentsController.crearDepartamento);
router.get('/', departmentsController.listarDepartamentos);
router.put('/:id', departmentsController.modificarDepartamento);

module.exports = router;
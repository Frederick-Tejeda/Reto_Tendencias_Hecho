const express = require('express');
const router = express.Router();
const departmentsController = require('../controllers/departmentsController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.post('/', verificarRol(['Administrador']), departmentsController.crearDepartamento);
router.get('/', verificarRol(['Administrador', 'Supervisor', 'Solicitante']), departmentsController.listarDepartamentos);
router.put('/:id', verificarRol(['Administrador']), departmentsController.modificarDepartamento);

module.exports = router;
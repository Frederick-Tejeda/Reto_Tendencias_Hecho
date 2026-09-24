const express = require('express');
const router = express.Router();
const departmentsController = require('../controllers/departmentsController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos

router.post('/', departmentsController.crearDepartamento);
router.get('/', departmentsController.listarDepartamentos);
router.put('/:id', departmentsController.modificarDepartamento);

module.exports = router;
const express = require('express');
const router = express.Router();
const departmentsController = require('../controllers/departmentsController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos

router.post('/departments', departmentsController.crearDepartamento);
router.get('/departments', departmentsController.listarDepartamentos);
router.put('/departments/:id', departmentsController.modificarDepartamento);

module.exports = router;
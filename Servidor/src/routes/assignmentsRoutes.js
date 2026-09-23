const express = require('express');
const router = express.Router();
const asignacionesController = require('../controllers/asignacionesController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// 3.3 Procesamiento de Asignaciones Automáticas
// Restringido para que solo administradores o el sistema lo ejecuten
router.post('/process-auto', verificarRol(['Administrador']), asignacionesController.procesarAsignacionesAutomaticas);

module.exports = router;
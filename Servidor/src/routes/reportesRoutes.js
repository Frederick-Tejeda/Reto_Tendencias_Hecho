const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// Endpoint: GET /api/v1/reportes/dashboard
router.get(
    '/dashboard', 
    verificarRol(['Administrador', 'Auditor', 'Supervisor', 'Consulta']), 
    reportesController.obtenerDashboardInventario
);

// Endpoint: GET /api/v1/reportes/tickets
router.get(
    '/tickets', 
    verificarRol(['Administrador', 'Auditor', 'Consulta']), 
    reportesController.obtenerReporteTickets
);

module.exports = router;
const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const { registrarAuditoria } = require('../middlewares/trazabilidadMiddleware'); // Importar Trazabilidad

router.use(verificarToken);

// Dashboard (Solo lectura, no requiere registro de auditoría transaccional)
router.get('/dashboard/summary', verificarRol(['Administrador', 'Auditor']), reportesController.obtenerDashboard);

// Reportes (Solo lectura)
router.get('/reports/general', verificarRol(['Administrador', 'Auditor']), reportesController.generarReporteGeneral);

// Cierre Diario (Requiere auditoría por ser un proceso de consolidación)
router.post(
    '/reports/daily-close', 
    verificarRol(['Despachador']), 
    registrarAuditoria('EJECUTAR_CIERRE_DIARIO', 'cierres_diarios'), // Inyección del Middleware RF-21
    reportesController.generarCierreDiario
);

module.exports = router;
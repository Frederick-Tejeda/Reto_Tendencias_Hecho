const express = require('express');
const router = express.Router();
const { obtenerAuditoria } = require('../controllers/auditoriaController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Validar token y restringir acceso a Auditor y Administrador
router.use(verificarToken);

// GET /api/v1/audit
router.get('/', verificarRol(['Auditor', 'Administrador', 'Audiencia']), obtenerAuditoria);

module.exports = router;
const express = require('express');
const router = express.Router();
const { 
    crearEstacion, 
    listarEstaciones, 
    actualizarEstacion 
} = require('../controllers/estacionesController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos
//router.use(verificarRol(['Administrador'])); // Asumiendo que solo administradores y supervisores pueden crear/modificar estaciones

// Rutas base: /api/v1/estaciones
router.post('/', verificarRol(['Administrador']), crearEstacion);
router.get('/', verificarRol(['Administrador', 'Supervisor']), listarEstaciones);
router.put('/:id', verificarRol(['Administrador']), actualizarEstacion);

module.exports = router;
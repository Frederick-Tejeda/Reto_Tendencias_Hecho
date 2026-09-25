const express = require('express');
const router = express.Router();
const { 
    crearEstacion, 
    listarEstaciones, 
    actualizarEstacion 
} = require('../controllers/estacionesController');

// Rutas base: /api/v1/estaciones
router.post('/', crearEstacion);
router.get('/', listarEstaciones);
router.put('/:id', actualizarEstacion);

module.exports = router;
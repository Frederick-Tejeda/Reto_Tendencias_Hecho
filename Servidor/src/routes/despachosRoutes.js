const express = require('express');
const router = express.Router();
const despachosController = require('../controllers/despachosController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.post(
    '/', 
    verificarRol(['Despachador', 'Administrador']), 
    despachosController.registrarDespacho
);

module.exports = router;
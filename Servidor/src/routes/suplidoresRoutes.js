const express = require('express');
const router = express.Router();
const { 
    crearSuplidor, 
    listarSuplidores, 
    actualizarSuplidor 
} = require('../controllers/suplidoresController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken); // Asumiendo que requieres auth para todos
router.use(verificarRol(['Administrador'])); // Asumiendo que solo administradores pueden crear/modificar suplidores

router.post('/', verificarRol(['Administrador']), crearSuplidor);
router.get('/', verificarRol(['Administrador', 'Supervisor']), listarSuplidores);
router.put('/:id', verificarRol(['Administrador']), actualizarSuplidor);

module.exports = router;
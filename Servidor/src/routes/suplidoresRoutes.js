const express = require('express');
const router = express.Router();
const { 
    crearSuplidor, 
    listarSuplidores, 
    actualizarSuplidor 
} = require('../controllers/suplidoresController');

router.post('/', crearSuplidor);
router.get('/', listarSuplidores);
router.put('/:id', actualizarSuplidor);

module.exports = router;
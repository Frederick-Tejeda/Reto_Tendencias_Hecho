const express = require('express');
const router = express.Router();
const adminUsersController = require('../controllers/adminUsersController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Proteger todo el router con autenticación y rol de Administrador
router.use(verificarToken);
router.use(verificarRol(['Administrador']));

// 1.2 Creación de Usuario
router.post('/', adminUsersController.crearUsuario);

// 1.5 Listar Usuarios
router.get('/', adminUsersController.listarUsuarios);

// 1.3 Modificar Usuario
router.put('/:id', adminUsersController.modificarUsuario);

// 1.4 Desactivar Usuario
router.put('/:id/deactivate', adminUsersController.desactivarUsuario);

// 1.6 Restablecer Contraseña
router.post('/:id/reset-password', adminUsersController.restablecerPassword);

module.exports = router;
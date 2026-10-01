const express = require('express');
const router = express.Router();
const adminUsersController = require('../controllers/adminUsersController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Proteger todo el router con autenticación y rol de Administrador
router.use(verificarToken);

// 1.2 Creación de Usuario
router.post('/', verificarRol(['Administrador']), adminUsersController.crearUsuario);

// 1.5 Listar Usuarios
router.get('/', verificarRol(['Administrador', 'Audiencia']), adminUsersController.listarUsuarios);

// 1.3 Modificar Usuario
router.put('/:id', verificarRol(['Administrador']), adminUsersController.modificarUsuario);

// 1.4 Desactivar Usuario
router.put('/:id/deactivate', verificarRol(['Administrador']), adminUsersController.desactivarUsuario);

// 1.6 Restablecer Contraseña
router.post('/:id/reset-password', verificarRol(['Administrador']), adminUsersController.restablecerPassword);

module.exports = router;
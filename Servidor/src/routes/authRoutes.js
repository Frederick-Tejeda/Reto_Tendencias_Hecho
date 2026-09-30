const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Endpoint: POST /api/v1/auth/login
router.post('/login', authController.login);

module.exports = router;
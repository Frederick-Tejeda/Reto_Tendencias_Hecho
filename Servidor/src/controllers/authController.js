const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const login = async (req, res) => {
    const { correo, password } = req.body;

    try {
        // 1. Buscar al usuario en la base de datos
        const result = await db.query(
            'SELECT id_usuario, correo, password_hash, rol FROM usuarios WHERE correo = $1 AND estado = true',
            [correo]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo.' });
        }

        const usuario = result.rows[0];

        // 2. Comparar la contraseña ingresada con el hash de la BD usando bcrypt
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);

        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // 3. Generar el JWT (JSON Web Token)
        const token = jwt.sign(
            { 
                id_usuario: usuario.id_usuario, 
                correo: usuario.correo,
                rol: usuario.rol 
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' } // La sesión durará 8 horas
        );

        // 4. Enviar respuesta exitosa al frontend o app móvil
        res.status(200).json({
            success: true,
            data: {
                token,
                "user":{
                    id: usuario.id_usuario,
                    correo: usuario.correo,
                    role: usuario.rol
                }
            }
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = { login };
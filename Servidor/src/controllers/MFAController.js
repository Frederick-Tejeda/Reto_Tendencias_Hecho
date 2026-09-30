const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken'); // Asumiendo que usas jsonwebtoken para cumplir con RS-05[cite: 1]
const db = require('../config/db')

const generarMFA = async (req, res) => {
    try {
        // 1. Obtener la información del usuario autenticado (ej. desde el JWT previo)
        const userEmail = req.usuario.correo; // Definido en Gestión de Empleados (RF-02)[cite: 1]
        
        // 2. Generar un secreto único de 32 caracteres
        const secret = authenticator.generateSecret();

        // 3. Guardar este 'secret' en la base de datos asociado al usuario
        await db.query('UPDATE usuarios SET mfa_secret = $1 WHERE id_usuario = $2', [secret, req.usuario.id_usuario]);

        // 4. Crear la URI con formato estándar para aplicaciones como Google Authenticator
        const appName = 'Gestión Combustible INTEC';
        const otpauth = authenticator.keyuri(userEmail, appName, secret);

        // 5. Convertir la URI en una imagen QR en formato Base64
        const qrCodeImage = await QRCode.toDataURL(otpauth);

        res.status(200).json({
            success: true,
            message: "Escanea este código QR en tu aplicación de autenticación.",
            qrCode: qrCodeImage,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Fallo al generar la configuración MFA" });
    }
};

const validarMFA = async (req, res) => {
    try {
        const { codigo } = req.body;

        // 1. Recuperar el secreto del usuario desde la base de datos
        const user = await db.query('SELECT mfa_secret FROM usuarios WHERE id_usuario = $1', [req.usuario.id_usuario]);
        const userSecret = user.rows[0].mfa_secret;

        if (!userSecret) {
            return res.status(400).json({ error: "MFA no está configurado para este usuario" });
        }

        // 2. Validar el codigo ingresado contra el secreto guardado
        const isValid = authenticator.check(codigo, userSecret);

        if (isValid) {

            await db.query('UPDATE usuarios SET mfa_required=$1 WHERE id_usuario=$2', [true, req.usuario.id_usuario]);

            // 3. Si es válido, emitir el JWT final para las APIs (RS-05)[cite: 1]
            const apiToken = jwt.sign(
                { 
                    id_usuario: req.usuario.id_usuario, 
                    correo: req.usuario.correo,
                    rol: req.usuario.rol,
                    id_empleado: req.usuario.id_empleado
                }, 
                process.env.JWT_SECRET, 
                { expiresIn: '8h' }
            );

            res.status(200).json({ 
                success: true,
                message: "Autenticación exitosa", 
                token: apiToken 
            });
        } else {
            res.status(401).json({ error: "Código MFA inválido o expirado" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en la validación MFA" });
    }
};

module.exports = { generarMFA, validarMFA }
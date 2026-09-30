const jwt = require('jsonwebtoken');

// Verifica que el JWT sea válido
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Se requiere un token de autenticación.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Token inválido o expirado.' });
        }
        req.usuario = decoded; // Guardamos los datos del usuario en la request
        next(); // Pasamos al siguiente controlador
    });
};

// Verifica que el usuario tenga un rol específico (RBAC)
const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ 
                error: `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}` 
            });
        }
        next();
    };
};

module.exports = { verificarToken, verificarRol };
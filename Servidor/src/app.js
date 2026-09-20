const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const catalogosRoutes = require('./routes/catalogosRoutes');
const solicitudesRoutes = require('./routes/solicitudesRoutes');
const ticketsRoutes = require('./routes/ticketsRoutes');
const despachosRoutes = require('./routes/despachosRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const cierreRoutes = require('./routes/cierreRoutes');
const reportesRoutes = require('./routes/reportesRoutes');
const { initCronJobs } = require('./service/cronService');
const adminUsersRoutes = require('./routes/adminUsersRoutes');
const operacionesRoutes = require('./routes/operacionesRoutes');

const app = express();

// Middlewares base
app.use(cors()); // Permite peticiones desde la PWA y la App Móvil
app.use(express.json()); // Permite al servidor entender cuerpos en formato JSON
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/catalogos', catalogosRoutes);
app.use('/api/v1/solicitudes', solicitudesRoutes);;
app.use('/api/v1/despachos', despachosRoutes);
app.use('/api/v1/inventario', inventarioRoutes);
app.use('/api/v1/cierres', cierreRoutes);
app.use('/api/v1/admin/users', adminUsersRoutes);
app.use('/api/v1/', ticketsRoutes)
app.use('/api/v1', operacionesRoutes);
app.use('/api/v1/', reportesRoutes);

initCronJobs();

// Ruta de prueba (Healthcheck)
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'API del Sistema de Combustible operativa y lista para despachar.' 
    });
});

module.exports = app;
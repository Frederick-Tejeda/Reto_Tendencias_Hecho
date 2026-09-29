const express = require('express');
const cors = require('cors');

const { initCronJobs } = require('./service/cronService');

initCronJobs();

// 1. Autenticación y Seguridad (RF-01, RS-01, RS-02)
const authRoutes = require('./routes/authRoutes');
const adminUsersRoutes = require('./routes/adminUsersRoutes');
// 2. Gestión de Catálogos (RF-02, RF-03, RF-04)
const departmentsRoutes = require('./routes/departmentsRoutes');
const employeesRoutes = require('./routes/employeesRoutes');
const vehiculesRoutes = require('./routes/vehiculesRoutes');
// 3. Solicitudes y Tickets (RF-05 al RF-11)
const solicitudesRoutes = require('./routes/solicitudesRoutes');
const assignmentsRoutes = require('./routes/assignmentsRoutes');
const ticketsRoutes = require('./routes/ticketsRoutes');
// 4. Operaciones de Despacho e Inventario (RF-12 al RF-17)
const despachosRoutes = require('./routes/despachosRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const estacionesRoutes = require('./routes/estacionesRoutes');
const suplidoresRoutes = require('./routes/suplidoresRoutes');
// 5. Cierre, Auditoría y Reportes (RF-18, RF-19, RF-21, RF-22)
const reportesRoutes = require('./routes/reportesRoutes');
// 6. MFA
const MFARoutes = require('./routes/MFARoutes')
// 6. SendTicket
//const sendTicketRoutes = require('./routes/sendTicketRoutes')

const app = express();

// Middlewares base
app.use(cors()); // Permite peticiones desde la PWA y la App Móvil
app.use(express.json()); // Permite al servidor entender cuerpos en formato JSON

// 1. Autenticación y Seguridad (RF-01, RS-01, RS-02)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin/users', adminUsersRoutes);
// 2. Gestión de Catálogos (RF-02, RF-03, RF-04)
app.use('/api/v1/departments', departmentsRoutes);
app.use('/api/v1/employees', employeesRoutes);
app.use('/api/v1/vehicles', vehiculesRoutes);
// 3. Solicitudes y Tickets (RF-05 al RF-11)
app.use('/api/v1/requests', solicitudesRoutes);
app.use('/api/v1/assignments', assignmentsRoutes);
app.use('/api/v1/tickets', ticketsRoutes);
// 4. Operaciones de Despacho e Inventario (RF-12 al RF-17)
app.use('/api/v1/dispatch', despachosRoutes);
app.use('/api/v1/inventory', inventarioRoutes);
app.use('/api/v1/stations', estacionesRoutes);
app.use('/api/v1/suppliers', suplidoresRoutes);
// 5. Cierre, Auditoría y Reportes (RF-18, RF-19, RF-21, RF-22)
app.use('/api/v1', reportesRoutes);
// 6. MFA
app.use('/api/v1/mfa', MFARoutes);
// 7. Envio de Tickets (RF-09)
//app.use('/api/v1/send', sendTicket);

// Ruta de prueba (Healthcheck)
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'API del Sistema de Combustible operativa y lista para despachar.' 
    });
});

module.exports = app;
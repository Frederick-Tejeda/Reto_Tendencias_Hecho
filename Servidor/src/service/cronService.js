const cron = require('node-cron');
const db = require('../config/db');

const initCronJobs = () => {
    console.log('⏳ Inicializando tareas programadas (Cron Jobs)...');

    // Tarea 1: Marcar tickets como "Próximos a vencer" (Se ejecuta cada hora en el minuto 0)
    // Cron expression: '0 * * * *'
    cron.schedule('0 * * * *', async () => {
        try {
            // Llama al procedimiento que marca los tickets a 24 horas de vencer
            await db.query('CALL marcar_tickets_proximos_vencer(24)');
            console.log('✅ [Cron] Revisión de tickets próximos a vencer ejecutada.');
            
            // Aquí podrías agregar lógica para buscar esos tickets y enviar correos/SMS (RF-09, RF-23)
        } catch (error) {
            console.error('❌ [Cron Error] Fallo al marcar tickets próximos a vencer:', error);
        }
    });

    // Tarea 2: Actualizar tickets a "Vencido" (Se ejecuta cada hora en el minuto 5)
    // Cron expression: '5 * * * *'
    cron.schedule('5 * * * *', async () => {
        try {
            await db.query('CALL actualizar_tickets_vencidos()');
            console.log('✅ [Cron] Limpieza de tickets vencidos ejecutada.');
        } catch (error) {
            console.error('❌ [Cron Error] Fallo al actualizar tickets vencidos:', error);
        }
    });

    // Tarea 3: Alerta de Inventario Bajo (RF-15 y RF-23) - Ejecución diaria a las 6:00 AM[cite: 1]
    // Cron expression: '0 6 * * *'
    cron.schedule('0 6 * * *', async () => {
        try {
            const result = await db.query(`
                SELECT t.id_tanque, e.nombre AS estacion, t.tipo_combustible, t.existencia_actual, t.nivel_critico 
                FROM inventario t
                JOIN estaciones e ON t.id_estacion = e.id_estacion
                WHERE t.existencia_actual <= t.nivel_critico
            `);

            if (result.rowCount > 0) {
                console.log(`⚠️ [Cron Alerta] Se detectaron ${result.rowCount} tanques en nivel crítico.`);
                // Aquí se integraría el servicio de notificaciones (ej. SMTP para enviar correo al Administrador)
            }
        } catch (error) {
            console.error('❌ [Cron Error] Fallo al verificar niveles de inventario:', error);
        }
    });
};

module.exports = { initCronJobs };
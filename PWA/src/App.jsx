import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import Login from './pages/login/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Usuarios from './pages/usuarios/Usuarios'
import Empleados from './pages/empleados/Empleados'
import Vehiculos from './pages/vehiculos/Vehiculos'
import Departamentos from './pages/departamentos/Departamentos'
import Solicitudes from './pages/solicitudes/Solicitudes'
import Recepcion from './pages/recepcion/Recepcion'
import Reportes from './pages/reportes/Reportes'
import Auditoria from './pages/auditoria/Auditoria'
import CierreDiario from './pages/cierre-diario/CierreDiario'

import EscaneoQR from './pages/Movil/EscaneoQR'
import ValidacionTicket from './pages/Movil/ValidacionTicket'
import RegistroDespacho from './pages/Movil/RegistroDespacho'
import ConsultaTickets from './pages/Movil/ConsultaTickets'

import ProtectedRoute from './routes/ProtectedRoute'

export const API_BASE_URL =
  'https://retotendencias-servidor.vercel.app/api/v1'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />

        {/* Dashboard - Administrador y Auditor */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Administrador', 'Auditor']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Administración de usuarios */}
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute allowedRoles={['Administrador']}>
              <Usuarios />
            </ProtectedRoute>
          }
        />

        {/* Administración de empleados */}
        <Route
          path="/empleados"
          element={
            <ProtectedRoute allowedRoles={['Administrador']}>
              <Empleados />
            </ProtectedRoute>
          }
        />

        {/* Administración de vehículos */}
        <Route
          path="/vehiculos"
          element={
            <ProtectedRoute allowedRoles={['Administrador']}>
              <Vehiculos />
            </ProtectedRoute>
          }
        />

        {/* Administración de departamentos */}
        <Route
          path="/departamentos"
          element={
            <ProtectedRoute allowedRoles={['Administrador']}>
              <Departamentos />
            </ProtectedRoute>
          }
        />

        {/* Solicitudes */}
        <Route
          path="/solicitudes"
          element={
            <ProtectedRoute
              allowedRoles={[
                'Administrador',
                'Supervisor',
                'Solicitante',
              ]}
            >
              <Solicitudes />
            </ProtectedRoute>
          }
        />

        {/* Recepción de combustible */}
        <Route
          path="/recepcion"
          element={
            <ProtectedRoute
              allowedRoles={['Administrador', 'Supervisor']}
            >
              <Recepcion />
            </ProtectedRoute>
          }
        />

        {/* Reportes */}
        <Route
          path="/reportes"
          element={
            <ProtectedRoute allowedRoles={['Administrador', 'Auditor']}>
              <Reportes />
            </ProtectedRoute>
          }
        />

        {/*
          Auditoría / trazabilidad.

          El backend actualmente registra información de auditoría,
          pero todavía no expone un endpoint para consultar esos
          registros. Se conserva la pantalla para mostrar correctamente
          que la funcionalidad de lectura está pendiente de backend.
        */}
        <Route
          path="/auditoria"
          element={
            <ProtectedRoute allowedRoles={['Administrador', 'Auditor']}>
              <Auditoria />
            </ProtectedRoute>
          }
        />

        {/* Cierre Diario - Despachador */}
        <Route
          path="/cierre-diario"
          element={
            <ProtectedRoute allowedRoles={['Despachador']}>
              <CierreDiario />
            </ProtectedRoute>
          }
        />

        {/* Flujo móvil del Despachador */}
        <Route
          path="/escanear"
          element={
            <ProtectedRoute allowedRoles={['Despachador']}>
              <EscaneoQR />
            </ProtectedRoute>
          }
        />

        <Route
          path="/despacho/validar/:qrData"
          element={
            <ProtectedRoute allowedRoles={['Despachador']}>
              <ValidacionTicket />
            </ProtectedRoute>
          }
        />

        <Route
          path="/despacho/registrar/:ticketId"
          element={
            <ProtectedRoute allowedRoles={['Despachador']}>
              <RegistroDespacho />
            </ProtectedRoute>
          }
        />

        <Route
          path="/despacho/tickets"
          element={
            <ProtectedRoute allowedRoles={['Despachador']}>
              <ConsultaTickets />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children, allowedRoles }) {
  const sesionGuardada = localStorage.getItem('fuelcontrol_usuario')
  const tokenGuardado = localStorage.getItem('fuelcontrol_token')

  // Ruta inicial válida para cada rol.
  const obtenerRutaInicial = (rol) => {
    switch (rol) {
      case 'Administrador':
        return '/dashboard'

      case 'Auditor':
        return '/dashboard'

      case 'Supervisor':
        return '/solicitudes'

      case 'Solicitante':
        return '/solicitudes'

      case 'Despachador':
        return '/cierre-diario'

      default:
        return '/login'
    }
  }

  // Sin sesión o token no se permite acceder a rutas protegidas.
  if (!sesionGuardada || !tokenGuardado) {
    return <Navigate to="/login" replace />
  }

  try {
    const sesion = JSON.parse(sesionGuardada)

    // La sesión debe contener al menos el rol.
    if (!sesion || !sesion.rol) {
      localStorage.removeItem('fuelcontrol_usuario')
      localStorage.removeItem('fuelcontrol_token')

      return <Navigate to="/login" replace />
    }

    // Si el rol no está autorizado para esta ruta,
    // se envía a una página que sí tenga permitida.
    if (
      allowedRoles &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(sesion.rol)
    ) {
      const rutaPermitida = obtenerRutaInicial(sesion.rol)

      return <Navigate to={rutaPermitida} replace />
    }

    return children
  } catch {
    // Si la sesión almacenada está dañada o no es JSON válido,
    // se limpia y se solicita iniciar sesión nuevamente.
    localStorage.removeItem('fuelcontrol_usuario')
    localStorage.removeItem('fuelcontrol_token')

    return <Navigate to="/login" replace />
  }
}

export default ProtectedRoute
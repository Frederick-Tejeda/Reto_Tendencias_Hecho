import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import {
  LayoutDashboard,
  Users,
  UserCog,
  Car,
  Building2,
  Fuel,
  Truck,
  FileText,
  Search,
  ClipboardCheck,
  LogOut,
  UserRound,
  QrCode,
  Ticket,
  ShieldCheck,
  X,
  Loader2,
  CheckCircle2,
  KeyRound,
} from 'lucide-react'

import FuelIcon from './../../assets/Icon.jpg'
import { API_BASE_URL } from '../../App.jsx'

function AdminLayout({ children }) {
  const navigate = useNavigate()

  const [esMovil, setEsMovil] = useState(window.innerWidth < 768)

  const [modalMfaAbierto, setModalMfaAbierto] = useState(false)
  const [cargandoQr, setCargandoQr] = useState(false)
  const [validandoCodigo, setValidandoCodigo] = useState(false)

  const [qrMfa, setQrMfa] = useState('')
  const [mensajeMfa, setMensajeMfa] = useState('')
  const [errorMfa, setErrorMfa] = useState('')
  const [codigoMfa, setCodigoMfa] = useState('')
  const [mfaActivado, setMfaActivado] = useState(false)

  useEffect(() => {
    const manejarRedimension = () => {
      setEsMovil(window.innerWidth < 768)
    }

    window.addEventListener('resize', manejarRedimension)

    return () => {
      window.removeEventListener('resize', manejarRedimension)
    }
  }, [])

  const sesionGuardada = localStorage.getItem('fuelcontrol_usuario')

  let usuarioActual = {
    usuario: '',
    nombre: 'Usuario',
    rol: 'Sin rol',
  }

  if (sesionGuardada) {
    try {
      usuarioActual = JSON.parse(sesionGuardada)
    } catch {
      usuarioActual = {
        usuario: '',
        nombre: 'Usuario',
        rol: 'Sin rol',
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('fuelcontrol_usuario')
    localStorage.removeItem('fuelcontrol_token')

    navigate('/login')
  }

  const cerrarModalMfa = () => {
    if (cargandoQr || validandoCodigo) {
      return
    }

    setModalMfaAbierto(false)
    setQrMfa('')
    setCodigoMfa('')
    setMensajeMfa('')
    setErrorMfa('')
    setMfaActivado(false)
  }

  const abrirConfiguracionMfa = async () => {
    const token = localStorage.getItem('fuelcontrol_token')

    setModalMfaAbierto(true)
    setQrMfa('')
    setCodigoMfa('')
    setMensajeMfa('')
    setErrorMfa('')
    setMfaActivado(false)

    if (!token) {
      setErrorMfa(
        'No se encontró una sesión válida. Cierra sesión e inicia nuevamente.',
      )
      return
    }

    setCargandoQr(true)

    try {
      const response = await fetch(`${API_BASE_URL}/mfa/generate`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message ||
            result?.Message ||
            'No fue posible generar la configuración MFA.',
        )
      }

      if (
        typeof result.qrCode !== 'string' ||
        !result.qrCode.startsWith('data:image')
      ) {
        throw new Error(
          'El servidor no devolvió un código QR válido.',
        )
      }

      setQrMfa(result.qrCode)

      setMensajeMfa(
        result.Message ||
          result.message ||
          'Escanea el código QR con tu aplicación de autenticación.',
      )
    } catch (error) {
      console.error('Error generando MFA:', error)

      setErrorMfa(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al generar el código MFA.',
      )
    } finally {
      setCargandoQr(false)
    }
  }

  const validarCodigoMfa = async (event) => {
    event.preventDefault()

    const codigo = codigoMfa.trim()
    const token = localStorage.getItem('fuelcontrol_token')

    setErrorMfa('')

    if (!token) {
      setErrorMfa(
        'No se encontró una sesión válida. Cierra sesión e inicia nuevamente.',
      )
      return
    }

    if (!/^\d{6}$/.test(codigo)) {
      setErrorMfa(
        'Introduce el código de 6 dígitos de tu aplicación de autenticación.',
      )
      return
    }

    setValidandoCodigo(true)

    try {
      const response = await fetch(`${API_BASE_URL}/mfa/validate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message ||
            result?.Message ||
            'El código MFA no pudo ser validado.',
        )
      }

      /*
        El contrato de MFA devuelve un token después de validar
        correctamente el código. Si backend entrega uno nuevo,
        conservamos ese token como la sesión actual.
      */
      if (result.token) {
        localStorage.setItem('fuelcontrol_token', result.token)
      }

      setMfaActivado(true)
      setCodigoMfa('')

      setMensajeMfa(
        result.Message ||
          result.message ||
          'Autenticación multifactor activada correctamente.',
      )
    } catch (error) {
      console.error('Error validando MFA:', error)

      setErrorMfa(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al validar el código MFA.',
      )
    } finally {
      setValidandoCodigo(false)
    }
  }

  /*
    Menú alineado con la matriz oficial de permisos del backend.

    IMPORTANTE:
    - Los permisos visuales del menú no sustituyen la autorización
      del backend.
    - ProtectedRoute aplica la misma separación de roles en App.jsx.
  */
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['Administrador', 'Auditor'],
      mostrarEnMovil: true,
    },
    {
      name: 'Escanear QR',
      path: '/escanear',
      icon: QrCode,
      roles: ['Despachador'],
      mostrarEnMovil: true,
      soloMovil: true,
    },
    {
      name: 'Tickets',
      path: '/despacho/tickets',
      icon: Ticket,
      roles: ['Despachador'],
      mostrarEnMovil: true,
      soloMovil: true,
    },
    {
      name: 'Usuarios',
      path: '/usuarios',
      icon: UserCog,
      roles: ['Administrador'],
      mostrarEnMovil: false,
    },
    {
      name: 'Empleados',
      path: '/empleados',
      icon: Users,
      roles: ['Administrador'],
      mostrarEnMovil: false,
    },
    {
      name: 'Vehículos',
      path: '/vehiculos',
      icon: Car,
      roles: ['Administrador'],
      mostrarEnMovil: false,
    },
    {
      name: 'Departamentos',
      path: '/departamentos',
      icon: Building2,
      roles: ['Administrador'],
      mostrarEnMovil: false,
    },
    {
      name: 'Solicitudes',
      path: '/solicitudes',
      icon: Fuel,
      roles: ['Administrador', 'Supervisor', 'Solicitante'],
      mostrarEnMovil: true,
    },
    {
      name: 'Recepción',
      path: '/recepcion',
      icon: Truck,
      roles: ['Administrador', 'Supervisor'],
      mostrarEnMovil: false,
    },
    {
      name: 'Reportes',
      path: '/reportes',
      icon: FileText,
      roles: ['Administrador', 'Auditor'],
      mostrarEnMovil: false,
    },
    {
      name: 'Auditoría',
      path: '/auditoria',
      icon: Search,
      roles: ['Administrador', 'Auditor'],
      mostrarEnMovil: false,
    },
    {
      name: 'Cierre Diario',
      path: '/cierre-diario',
      icon: ClipboardCheck,
      roles: ['Despachador'],
      mostrarEnMovil: true,
    },
  ]

  const menuItemsPermitidos = menuItems.filter((item) => {
    const tienePermisoDeRol =
      !item.roles || item.roles.includes(usuarioActual.rol)

    if (!tienePermisoDeRol) return false
    if (esMovil && !item.mostrarEnMovil) return false
    if (!esMovil && item.soloMovil) return false

    return true
  })

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-[#1d4ed8] via-[#2563eb] to-[#06b6d4] text-white flex-col z-20 shadow-xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] overflow-hidden flex items-center justify-center shrink-0 shadow-md bg-white">
              <img
                src={FuelIcon}
                alt="FuelPass Logo"
                className="w-[112%] h-[112%] max-w-none object-cover object-center"
              />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-wide">
                FuelPass
              </h1>

              <p className="text-[10px] text-blue-100 uppercase tracking-widest">
                Gestión de combustible
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItemsPermitidos.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                    isActive
                      ? 'bg-white text-[#1d4ed8] shadow-md transform scale-[1.02]'
                      : 'text-blue-50 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={
                        isActive ? 'text-[#2563eb]' : ''
                      }
                    />

                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
              <UserRound size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {usuarioActual.nombre}
              </p>

              <p className="text-xs text-blue-100 truncate">
                {usuarioActual.rol}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirConfiguracionMfa}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-blue-50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ShieldCheck size={20} />
            <span>Seguridad / MFA</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-blue-50 hover:bg-red-500 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-10 shadow-sm">
          <div>
            <p className="text-xs md:text-sm text-[#06b6d4] font-semibold uppercase tracking-wider">
              {esMovil
                ? 'FuelPass · PWA Móvil'
                : 'FuelPass · Plataforma Web'}
            </p>

            <h2 className="text-base md:text-xl font-bold text-slate-800 truncate">
              {esMovil ? 'Operaciones' : 'Administración'}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:block text-right">
              <p className="font-bold text-slate-800">
                {usuarioActual.nombre}
              </p>

              <p className="text-sm text-[#2563eb] font-medium">
                {usuarioActual.rol}
              </p>
            </div>

            <button
              type="button"
              onClick={abrirConfiguracionMfa}
              className="w-8 h-8 md:w-11 md:h-11 rounded-full bg-gradient-to-tr from-[#2563eb] to-[#22d3ee] text-white flex items-center justify-center shrink-0 shadow-md hover:scale-105 transition-transform"
              aria-label="Abrir configuración de seguridad"
              title="Seguridad / MFA"
            >
              <UserRound size={esMovil ? 16 : 22} />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="md:hidden ml-1 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {esMovil && (
        <nav className="md:hidden fixed bottom-0 w-full h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-50 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
          {menuItemsPermitidos.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${
                    isActive
                      ? 'text-[#2563eb] transform -translate-y-1'
                      : 'text-slate-400 hover:text-[#06b6d4]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={24}
                      strokeWidth={isActive ? 2.5 : 2}
                    />

                    <span
                      className={`text-[10px] font-medium tracking-wide ${
                        isActive ? 'font-bold' : ''
                      }`}
                    >
                      {item.name}
                    </span>

                    {isActive && (
                      <div className="absolute bottom-0 w-8 h-1 bg-gradient-to-r from-[#2563eb] to-[#22d3ee] rounded-t-full" />
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      )}

      {modalMfaAbierto && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between gap-4 p-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ShieldCheck size={23} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Seguridad de la cuenta
                  </h2>

                  <p className="text-sm text-slate-500">
                    Autenticación multifactor
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={cerrarModalMfa}
                disabled={cargandoQr || validandoCodigo}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6">
              {cargandoQr && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2
                    size={38}
                    className="animate-spin text-blue-600"
                  />

                  <p className="mt-4 font-semibold text-slate-700">
                    Preparando MFA...
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Generando tu código QR de autenticación.
                  </p>
                </div>
              )}

              {!cargandoQr && errorMfa && !qrMfa && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="font-semibold text-red-800">
                    No fue posible configurar MFA
                  </p>

                  <p className="text-sm text-red-700 mt-1">
                    {errorMfa}
                  </p>
                </div>
              )}

              {!cargandoQr && mfaActivado && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                    <CheckCircle2 size={34} />
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mt-5">
                    MFA activado
                  </h3>

                  <p className="text-sm text-slate-600 mt-2">
                    {mensajeMfa}
                  </p>

                  <p className="text-sm text-slate-500 mt-4 leading-6">
                    En los próximos inicios de sesión se te
                    solicitará el código de tu aplicación de
                    autenticación.
                  </p>

                  <button
                    type="button"
                    onClick={cerrarModalMfa}
                    className="mt-6 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              )}

              {!cargandoQr && qrMfa && !mfaActivado && (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
                    <div className="flex gap-3">
                      <KeyRound
                        size={21}
                        className="text-blue-600 shrink-0 mt-0.5"
                      />

                      <div>
                        <p className="font-semibold text-blue-900">
                          Activar autenticación multifactor
                        </p>

                        <p className="text-sm text-blue-800 mt-1 leading-6">
                          {mensajeMfa ||
                            'Escanea este código QR con tu aplicación de autenticación.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <img
                        src={qrMfa}
                        alt="Código QR para configurar MFA"
                        className="w-52 h-52 object-contain"
                      />
                    </div>
                  </div>

                  <div className="mt-5 text-sm text-slate-600 leading-6">
                    <p>
                      1. Abre tu aplicación de autenticación.
                    </p>

                    <p>
                      2. Escanea el código QR mostrado arriba.
                    </p>

                    <p>
                      3. Introduce abajo el código de 6 dígitos
                      generado por la aplicación.
                    </p>
                  </div>

                  <form
                    onSubmit={validarCodigoMfa}
                    className="mt-6"
                  >
                    <label
                      htmlFor="codigo-mfa"
                      className="block text-sm font-semibold text-slate-700 mb-2"
                    >
                      Código de verificación
                    </label>

                    <input
                      id="codigo-mfa"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={codigoMfa}
                      onChange={(event) => {
                        const valor = event.target.value.replace(
                          /\D/g,
                          '',
                        )

                        setCodigoMfa(valor)
                        setErrorMfa('')
                      }}
                      placeholder="000000"
                      disabled={validandoCodigo}
                      className="w-full text-center tracking-[0.45em] text-xl font-bold border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                    />

                    {errorMfa && (
                      <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                        {errorMfa}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        validandoCodigo ||
                        codigoMfa.length !== 6
                      }
                      className={`mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-colors ${
                        validandoCodigo ||
                        codigoMfa.length !== 6
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {validandoCodigo ? (
                        <>
                          <Loader2
                            size={20}
                            className="animate-spin"
                          />
                          Validando...
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={20} />
                          Validar y activar MFA
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminLayout
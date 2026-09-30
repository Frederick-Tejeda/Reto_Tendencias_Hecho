import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Loader2 } from 'lucide-react'

import FuelIcon from '../../assets/Icon2.jpg'
import { API_BASE_URL } from '../../App.jsx'

function Login() {
  const navigate = useNavigate()

  const [identificador, setIdentificador] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

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
        return null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setCargando(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo: identificador.trim(),
          password: contrasena,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            'Correo o contraseña incorrectos.'
        )
        return
      }

      const token = result.data?.token || result.token
      const user = result.data?.user || result.user || {}

      const usuarioGuardar = {
        id: user.id || '',
        nombre:
          user.name ||
          user.nombre ||
          'Usuario',
        correo:
          user.correo ||
          user.email ||
          identificador.trim(),
        rol:
          user.rol ||
          user.role ||
          'Sin rol',
      }

      if (!token) {
        setError(
          'El servidor no devolvió un token de autenticación.'
        )
        return
      }

      const rutaInicial = obtenerRutaInicial(
        usuarioGuardar.rol
      )

      if (!rutaInicial) {
        setError(
          'El usuario inició sesión, pero su rol no tiene una ruta configurada en el frontend.'
        )
        return
      }

      localStorage.setItem(
        'fuelcontrol_token',
        token
      )

      localStorage.setItem(
        'fuelcontrol_usuario',
        JSON.stringify(usuarioGuardar)
      )

      navigate(rutaInicial, { replace: true })
    } catch (err) {
      setError(
        `No fue posible conectar con el servidor. ${err.message}`
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-[24px] shadow-2xl p-8 relative z-10 border border-white/50">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-[20px] overflow-hidden flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20 bg-white">
            <img
              src={FuelIcon}
              alt="FuelPass Logo"
              className="w-[118%] h-[118%] max-w-none object-cover object-center"
            />
          </div>

          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent">
            FuelPass
          </h1>

          <p className="text-slate-500 mt-2 font-medium">
            Sistema de Gestión de Combustible
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="identificador"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Correo o Usuario
            </label>

            <input
              id="identificador"
              type="text"
              value={identificador}
              onChange={(e) =>
                setIdentificador(e.target.value)
              }
              placeholder="Ej. User@email.com"
              required
              autoComplete="username"
              className="w-full border border-slate-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50 hover:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="contrasena"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Contraseña
            </label>

            <input
              id="contrasena"
              type="password"
              value={contrasena}
              onChange={(e) =>
                setContrasena(e.target.value)
              }
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full border border-slate-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50 hover:bg-white"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
          >
            {cargando ? (
              <>
                <Loader2
                  size={20}
                  className="animate-spin"
                />
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <div className="mt-8 bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-800 leading-relaxed font-medium">
            Entorno conectado a la API. Utiliza una
            cuenta configurada en el servidor para
            ingresar.
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          INTEC · Sistema de Gestión de Combustible ·
          v1.0
        </p>
      </div>
    </div>
  )
}

export default Login
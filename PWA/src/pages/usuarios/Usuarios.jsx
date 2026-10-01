import { useEffect, useMemo, useState } from 'react'
import {
  UserPlus,
  Search,
  Pencil,
  Power,
  KeyRound,
  X,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

import AdminLayout from '../../components/layouts/AdminLayout'
import { API_BASE_URL } from '../../App.jsx'

const ROLES = [
  'Administrador',
  'Supervisor',
  'Despachador',
  'Solicitante',
  'Auditor',
]

const formularioInicial = {
  nombre: '',
  correo: '',
  rol: 'Solicitante',
  idEmpleado: '',
  contrasena: '',
}

function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [empleados, setEmpleados] = useState([])

  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [busqueda, setBusqueda] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState(null)
  const [formulario, setFormulario] = useState(formularioInicial)

  const [mostrarRestablecer, setMostrarRestablecer] = useState(false)
  const [usuarioRestablecer, setUsuarioRestablecer] = useState(null)
  const [nuevaContrasena, setNuevaContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')

  const obtenerToken = () => {
    return localStorage.getItem('fuelcontrol_token')
  }

  const obtenerHeaders = (conContenido = false) => {
    const headers = {
      Authorization: `Bearer ${obtenerToken()}`,
      Accept: 'application/json',
    }

    if (conContenido) {
      headers['Content-Type'] = 'application/json'
    }

    return headers
  }

  const leerRespuesta = async (response) => {
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      return await response.json()
    }

    const texto = await response.text()

    return {
      success: response.ok,
      message: texto || `Respuesta HTTP ${response.status}`,
    }
  }

  const obtenerLista = (resultado) => {
    if (Array.isArray(resultado)) return resultado
    if (Array.isArray(resultado?.data)) return resultado.data
    if (Array.isArray(resultado?.data?.items)) return resultado.data.items
    if (Array.isArray(resultado?.items)) return resultado.items

    return []
  }

  const normalizarUsuario = (usuario) => {
    const id =
      usuario.id_usuario ??
      usuario.id ??
      usuario.uuid ??
      null

    const idEmpleado =
      usuario.id_empleado === 'null'
        ? null
        : usuario.id_empleado ??
          usuario.employeeId ??
          null

    return {
      id: id !== null ? String(id) : null,
      idEmpleado:
        idEmpleado !== null && idEmpleado !== undefined
          ? String(idEmpleado)
          : '',
      nombre:
        usuario.name ??
        usuario.fullName ??
        usuario.nombre ??
        '',
      correo:
        usuario.correo ??
        usuario.email ??
        '',
      rol:
        usuario.rol ??
        usuario.role ??
        'Sin rol',
      estado:
        typeof usuario.isActive === 'boolean'
          ? usuario.isActive
            ? 'Activo'
            : 'Inactivo'
          : usuario.status ?? 'Sin estado',
    }
  }

  const normalizarEmpleado = (empleado) => {
    const id =
      empleado.id_empleado ??
      empleado.id ??
      empleado.employeeId ??
      null

    const nombre =
      empleado.nombre_completo ??
      empleado.fullName ??
      empleado.name ??
      empleado.nombre ??
      ''

    const codigo =
      empleado.codigo_empleado ??
      empleado.employeeCode ??
      empleado.code ??
      ''

    const correo =
      empleado.correo ??
      empleado.email ??
      ''

    return {
      id: id !== null ? String(id) : null,
      nombre,
      codigo,
      correo,
    }
  }

  const cargarDatos = async () => {
    setCargando(true)
    setError('')

    try {
      const [respuestaUsuarios, respuestaEmpleados] =
        await Promise.all([
          fetch(`${API_BASE_URL}/admin/users`, {
            method: 'GET',
            headers: obtenerHeaders(),
          }),
          fetch(`${API_BASE_URL}/employees`, {
            method: 'GET',
            headers: obtenerHeaders(),
          }),
        ])

      const resultadoUsuarios =
        await leerRespuesta(respuestaUsuarios)

      if (!respuestaUsuarios.ok) {
        throw new Error(
          resultadoUsuarios?.error ||
            resultadoUsuarios?.message ||
            resultadoUsuarios?.mensaje ||
            `No fue posible cargar los usuarios. Código HTTP ${respuestaUsuarios.status}.`
        )
      }

      const listaUsuarios = obtenerLista(resultadoUsuarios)
        .map(normalizarUsuario)
        .filter((usuario) => usuario.id !== null)

      setUsuarios(listaUsuarios)

      const resultadoEmpleados =
        await leerRespuesta(respuestaEmpleados)

      if (respuestaEmpleados.ok) {
        const listaEmpleados = obtenerLista(
          resultadoEmpleados
        )
          .map(normalizarEmpleado)
          .filter((empleado) => empleado.id !== null)

        setEmpleados(listaEmpleados)
      } else {
        console.warn(
          'No fue posible cargar empleados:',
          resultadoEmpleados
        )

        setEmpleados([])
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err)

      setError(
        err.message ||
          'No fue posible cargar los usuarios.'
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) return usuarios

    return usuarios.filter((usuario) =>
      [
        usuario.nombre,
        usuario.correo,
        usuario.rol,
        usuario.estado,
        usuario.idEmpleado,
      ].some((valor) =>
        String(valor ?? '')
          .toLowerCase()
          .includes(texto)
      )
    )
  }, [usuarios, busqueda])

  const totalActivos = usuarios.filter(
    (usuario) => usuario.estado === 'Activo'
  ).length

  const totalInactivos = usuarios.filter(
    (usuario) => usuario.estado === 'Inactivo'
  ).length

  const abrirNuevoUsuario = () => {
    setUsuarioEditando(null)
    setFormulario(formularioInicial)
    setError('')
    setMensaje('')
    setMostrarFormulario(true)
  }

  const abrirEditarUsuario = (usuario) => {
    setUsuarioEditando(usuario)

    setFormulario({
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      idEmpleado: usuario.idEmpleado || '',
      contrasena: '',
    })

    setError('')
    setMensaje('')
    setMostrarFormulario(true)
  }

  const cerrarFormulario = () => {
    if (procesando) return

    setMostrarFormulario(false)
    setUsuarioEditando(null)
    setFormulario(formularioInicial)
    setError('')
  }

  const manejarCambio = (evento) => {
    const { name, value } = evento.target

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  const guardarUsuario = async (evento) => {
    evento.preventDefault()

    setError('')
    setMensaje('')

    const nombre = formulario.nombre.trim()
    const correo = formulario.correo.trim().toLowerCase()
    const idEmpleado = formulario.idEmpleado
      ? String(formulario.idEmpleado)
      : ''

    const esEdicion = Boolean(usuarioEditando)

    if (!correo) {
      setError('El correo electrónico es obligatorio.')
      return
    }

    if (!formulario.rol) {
      setError('Debes seleccionar un rol.')
      return
    }

    if (!idEmpleado) {
      setError(
        'Debes seleccionar el empleado asociado a la cuenta.'
      )
      return
    }

    if (!esEdicion && !nombre) {
      setError('El nombre del usuario es obligatorio.')
      return
    }

    if (
      !esEdicion &&
      formulario.contrasena.length < 12
    ) {
      setError(
        'La contraseña inicial debe tener al menos 12 caracteres.'
      )
      return
    }

    setProcesando(true)

    let payload

    if (esEdicion) {
      /*
       * Contrato PUT /admin/users/:id:
       * {
       *   data: {
       *     correo,
       *     rol,
       *     id_empleado
       *   }
       * }
       *
       * El contrato actual no incluye "name" en modificación.
       */
      payload = {
        data: {
          correo,
          rol: formulario.rol,
          id_empleado: idEmpleado,
        },
      }
    } else {
      /*
       * Contrato POST /admin/users:
       * {
       *   rol,
       *   data: {
       *     correo,
       *     password,
       *     name,
       *     id_empleado
       *   }
       * }
       */
      payload = {
        rol: formulario.rol,
        data: {
          correo,
          password: formulario.contrasena,
          name: nombre,
          id_empleado: idEmpleado,
        },
      }
    }

    const url = esEdicion
      ? `${API_BASE_URL}/admin/users/${usuarioEditando.id}`
      : `${API_BASE_URL}/admin/users`

    try {
      const response = await fetch(url, {
        method: esEdicion ? 'PUT' : 'POST',
        headers: obtenerHeaders(true),
        body: JSON.stringify(payload),
      })

      const resultado = await leerRespuesta(response)

      if (!response.ok || resultado?.success === false) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            resultado?.mensaje ||
            `No fue posible guardar el usuario. Código HTTP ${response.status}.`
        )
      }

      setMostrarFormulario(false)
      setUsuarioEditando(null)
      setFormulario(formularioInicial)

      setMensaje(
        esEdicion
          ? 'Usuario actualizado correctamente.'
          : 'Usuario creado correctamente.'
      )

      await cargarDatos()
    } catch (err) {
      console.error('Error guardando usuario:', err)

      setError(
        err.message ||
          'No fue posible guardar el usuario.'
      )
    } finally {
      setProcesando(false)
    }
  }

  const cambiarEstado = async (usuario) => {
    if (usuario.estado !== 'Activo') {
      setError(
        'El contrato disponible define la desactivación de usuarios, pero no una operación separada para reactivarlos.'
      )
      return
    }

    const confirmacion = window.confirm(
      `¿Seguro que deseas desactivar a ${usuario.nombre}?`
    )

    if (!confirmacion) return

    setProcesando(true)
    setError('')
    setMensaje('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/users/${usuario.id}/deactivate`,
        {
          method: 'PUT',
          headers: obtenerHeaders(true),
          body: JSON.stringify({
            reason: 'Desactivación administrativa',
            isActive: false,
          }),
        }
      )

      const resultado = await leerRespuesta(response)

      if (!response.ok || resultado?.success === false) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            resultado?.mensaje ||
            `No fue posible desactivar el usuario. Código HTTP ${response.status}.`
        )
      }

      setMensaje('Usuario desactivado correctamente.')
      await cargarDatos()
    } catch (err) {
      console.error('Error desactivando usuario:', err)

      setError(
        err.message ||
          'No fue posible desactivar el usuario.'
      )
    } finally {
      setProcesando(false)
    }
  }

  const abrirRestablecerContrasena = (usuario) => {
    setUsuarioRestablecer(usuario)
    setNuevaContrasena('')
    setConfirmarContrasena('')
    setError('')
    setMensaje('')
    setMostrarRestablecer(true)
  }

  const cerrarRestablecerContrasena = () => {
    if (procesando) return

    setMostrarRestablecer(false)
    setUsuarioRestablecer(null)
    setNuevaContrasena('')
    setConfirmarContrasena('')
    setError('')
  }

  const restablecerContrasena = async (evento) => {
    evento.preventDefault()

    setError('')
    setMensaje('')

    if (nuevaContrasena.length < 12) {
      setError(
        'La nueva contraseña debe tener al menos 12 caracteres.'
      )
      return
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setProcesando(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/users/${usuarioRestablecer.id}/reset-password`,
        {
          method: 'POST',
          headers: obtenerHeaders(true),
          body: JSON.stringify({
            newPassword: nuevaContrasena,
            requireChangeOnNextLogin: true,
          }),
        }
      )

      const resultado = await leerRespuesta(response)

      if (!response.ok || resultado?.success === false) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            resultado?.mensaje ||
            `No fue posible restablecer la contraseña. Código HTTP ${response.status}.`
        )
      }

      setMostrarRestablecer(false)
      setUsuarioRestablecer(null)
      setNuevaContrasena('')
      setConfirmarContrasena('')

      setMensaje(
        'Contraseña restablecida correctamente.'
      )
    } catch (err) {
      console.error(
        'Error restableciendo contraseña:',
        err
      )

      setError(
        err.message ||
          'No fue posible restablecer la contraseña.'
      )
    } finally {
      setProcesando(false)
    }
  }

  const obtenerEstiloRol = (rol) => {
    switch (rol) {
      case 'Administrador':
        return 'bg-purple-100 text-purple-700'
      case 'Supervisor':
        return 'bg-blue-100 text-blue-700'
      case 'Despachador':
        return 'bg-amber-100 text-amber-700'
      case 'Solicitante':
        return 'bg-cyan-100 text-cyan-700'
      case 'Auditor':
        return 'bg-emerald-100 text-emerald-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const obtenerNombreEmpleado = (empleado) => {
    const partes = []

    if (empleado.codigo) partes.push(empleado.codigo)
    if (empleado.nombre) partes.push(empleado.nombre)

    if (partes.length === 0) {
      return `Empleado #${empleado.id}`
    }

    return partes.join(' - ')
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Gestión de Usuarios
            </h1>

            <p className="text-slate-500 mt-2">
              Administración de cuentas, estados y roles del sistema
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNuevoUsuario}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition-colors"
          >
            <UserPlus size={20} />
            Nuevo usuario
          </button>
        </div>

        {error &&
          !mostrarFormulario &&
          !mostrarRestablecer && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle
                size={22}
                className="shrink-0 mt-0.5"
              />

              <div>
                <p className="font-semibold">
                  No se pudo completar la operación
                </p>

                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

        {mensaje &&
          !mostrarFormulario &&
          !mostrarRestablecer && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl">
              {mensaje}
            </div>
          )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Total usuarios
                </p>

                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {cargando ? '-' : usuarios.length}
                </p>
              </div>

              <div className="bg-blue-100 text-blue-700 p-3 rounded-xl">
                <Users size={22} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Activos
                </p>

                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {cargando ? '-' : totalActivos}
                </p>
              </div>

              <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl">
                <UserCheck size={22} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Inactivos
                </p>

                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {cargando ? '-' : totalInactivos}
                </p>
              </div>

              <div className="bg-red-100 text-red-700 p-3 rounded-xl">
                <UserX size={22} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
                placeholder="Buscar usuario..."
                className="w-full border border-slate-300 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={cargarDatos}
              disabled={cargando}
              className="inline-flex items-center justify-center gap-2 border border-slate-300 px-4 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                className={cargando ? 'animate-spin' : ''}
              />
              Actualizar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Usuario
                  </th>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Rol
                  </th>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Estado
                  </th>
                  <th className="text-center px-5 py-4 text-sm font-semibold text-slate-600">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="text-center py-12"
                    >
                      <Loader2
                        size={32}
                        className="animate-spin text-blue-600 mx-auto mb-3"
                      />
                      <p className="text-slate-500">
                        Cargando usuarios...
                      </p>
                    </td>
                  </tr>
                ) : usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="text-center py-12 text-slate-500"
                    >
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <tr
                      key={`usuario-${usuario.id}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800 whitespace-nowrap">
                          {usuario.nombre || 'Sin nombre'}
                        </p>

                        <p className="text-sm text-slate-500 whitespace-nowrap">
                          {usuario.correo || 'Sin correo'}
                        </p>

                        {usuario.idEmpleado && (
                          <p className="text-xs text-slate-400 mt-1">
                            Empleado #{usuario.idEmpleado}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${obtenerEstiloRol(
                            usuario.rol
                          )}`}
                        >
                          <ShieldCheck size={14} />
                          {usuario.rol}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            usuario.estado === 'Activo'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {usuario.estado}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              abrirEditarUsuario(usuario)
                            }
                            title="Modificar usuario"
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil size={18} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              abrirRestablecerContrasena(
                                usuario
                              )
                            }
                            title="Restablecer contraseña"
                            className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <KeyRound size={18} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              cambiarEstado(usuario)
                            }
                            disabled={
                              procesando ||
                              usuario.estado !== 'Activo'
                            }
                            title={
                              usuario.estado === 'Activo'
                                ? 'Desactivar usuario'
                                : 'Usuario inactivo'
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              usuario.estado === 'Activo'
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                          >
                            <Power size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {usuarioEditando
                    ? 'Modificar usuario'
                    : 'Crear usuario'}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Configure la cuenta y su empleado asociado
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarFormulario}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={guardarUsuario}
              className="p-6"
            >
              {error && (
                <div className="mb-5 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3">
                  <AlertCircle
                    size={21}
                    className="shrink-0"
                  />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Empleado asociado
                  </label>

                  <select
                    name="idEmpleado"
                    value={formulario.idEmpleado}
                    onChange={manejarCambio}
                    required
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="null">
                      Seleccione un empleado
                    </option>

                    {empleados.map((empleado) => (
                      <option
                        key={`empleado-${empleado.id}`}
                        value={empleado.id}
                      >
                        {obtenerNombreEmpleado(empleado)}
                      </option>
                    ))}
                  </select>

                  {empleados.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      No se pudieron obtener empleados disponibles.
                    </p>
                  )}
                </div>

                {!usuarioEditando && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nombre completo
                    </label>

                    <input
                      type="text"
                      name="nombre"
                      value={formulario.nombre}
                      onChange={manejarCambio}
                      required
                      placeholder="Nombre del usuario"
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}

                {usuarioEditando && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nombre completo
                    </label>

                    <input
                      type="text"
                      value={formulario.nombre}
                      disabled
                      className="w-full border border-slate-200 bg-slate-100 text-slate-500 rounded-lg px-4 py-3 cursor-not-allowed"
                    />

                    <p className="text-xs text-slate-500 mt-2">
                      El contrato actual de modificación de usuario no incluye el nombre.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Correo electrónico
                  </label>

                  <input
                    type="email"
                    name="correo"
                    value={formulario.correo}
                    onChange={manejarCambio}
                    required
                    placeholder="usuario@institucion.edu.do"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rol
                  </label>

                  <select
                    name="rol"
                    value={formulario.rol}
                    onChange={manejarCambio}
                    required
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {ROLES.map((rol) => (
                      <option
                        key={`rol-${rol}`}
                        value={rol}
                      >
                        {rol}
                      </option>
                    ))}
                  </select>
                </div>

                {!usuarioEditando && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contraseña inicial
                    </label>

                    <input
                      type="password"
                      name="contrasena"
                      value={formulario.contrasena}
                      onChange={manejarCambio}
                      required
                      minLength={12}
                      placeholder="Mínimo 12 caracteres"
                      autoComplete="new-password"
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />

                    <p className="text-xs text-slate-500 mt-2">
                      Debe contener al menos 12 caracteres.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={cerrarFormulario}
                  disabled={procesando}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={procesando}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {procesando && (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  )}

                  {usuarioEditando
                    ? 'Guardar cambios'
                    : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarRestablecer && usuarioRestablecer && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Restablecer contraseña
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {usuarioRestablecer.nombre}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarRestablecerContrasena}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={restablecerContrasena}
              className="p-6"
            >
              {error && (
                <div className="mb-5 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3">
                  <AlertCircle
                    size={21}
                    className="shrink-0"
                  />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nueva contraseña
                  </label>

                  <input
                    type="password"
                    value={nuevaContrasena}
                    onChange={(e) =>
                      setNuevaContrasena(e.target.value)
                    }
                    required
                    minLength={12}
                    placeholder="Mínimo 12 caracteres"
                    autoComplete="new-password"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirmar contraseña
                  </label>

                  <input
                    type="password"
                    value={confirmarContrasena}
                    onChange={(e) =>
                      setConfirmarContrasena(e.target.value)
                    }
                    required
                    minLength={12}
                    placeholder="Repita la contraseña"
                    autoComplete="new-password"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={cerrarRestablecerContrasena}
                  disabled={procesando}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={procesando}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {procesando ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <KeyRound size={18} />
                  )}

                  Restablecer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Usuarios
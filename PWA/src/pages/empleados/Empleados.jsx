import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Plus,
  Pencil,
  UserCheck,
  UserX,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

import AdminLayout from '../../components/layouts/AdminLayout'
import { API_BASE_URL } from '../../App.jsx'

const formularioInicial = {
  employeeCode: '',
  fullName: '',
  identificationCard: '',
  departmentId: '',
  position: '',
  email: '',
  mobilePhone: '',
  status: 'Activo',
}

const usuarioLoggeadoRol = JSON.parse(localStorage.getItem("fuelcontrol_usuario")).rol;

function Empleados() {
  const [empleados, setEmpleados] = useState([])
  const [departamentos, setDepartamentos] = useState([])

  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [empleadoEditando, setEmpleadoEditando] = useState(null)
  const [formulario, setFormulario] = useState(formularioInicial)

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
    if (Array.isArray(resultado)) {
      return resultado
    }

    if (Array.isArray(resultado?.data)) {
      return resultado.data
    }

    if (Array.isArray(resultado?.data?.items)) {
      return resultado.data.items
    }

    if (Array.isArray(resultado?.items)) {
      return resultado.items
    }

    return []
  }

  const cargarDatos = async () => {
    setCargando(true)
    setError('')

    try {
      const [respuestaEmpleados, respuestaDepartamentos] =
        await Promise.all([
          fetch(`${API_BASE_URL}/employees`, {
            method: 'GET',
            headers: obtenerHeaders(),
          }),
          fetch(`${API_BASE_URL}/departments`, {
            method: 'GET',
            headers: obtenerHeaders(),
          }),
        ])

      const [resultadoEmpleados, resultadoDepartamentos] =
        await Promise.all([
          leerRespuesta(respuestaEmpleados),
          leerRespuesta(respuestaDepartamentos),
        ])

      if (!respuestaEmpleados.ok) {
        throw new Error(
          resultadoEmpleados?.error ||
            resultadoEmpleados?.message ||
            `No fue posible cargar los empleados. Código HTTP ${respuestaEmpleados.status}.`
        )
      }

      if (!respuestaDepartamentos.ok) {
        throw new Error(
          resultadoDepartamentos?.error ||
            resultadoDepartamentos?.message ||
            `No fue posible cargar los departamentos. Código HTTP ${respuestaDepartamentos.status}.`
        )
      }

      setEmpleados(obtenerLista(resultadoEmpleados))
      setDepartamentos(obtenerLista(resultadoDepartamentos))
    } catch (err) {
      console.error('Error cargando empleados:', err)

      setError(
        err.message ||
          'No fue posible cargar la información de empleados.'
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const empleadosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) {
      return empleados
    }

    return empleados.filter((empleado) => {
      const departamento =
        empleado.department?.name ||
        empleado.departmentName ||
        ''

      return [
        empleado.employeeCode,
        empleado.fullName,
        departamento,
        empleado.status,
      ].some((valor) =>
        String(valor ?? '')
          .toLowerCase()
          .includes(texto)
      )
    })
  }, [empleados, busqueda])

  const abrirNuevoEmpleado = () => {
    setEmpleadoEditando(null)
    setFormulario(formularioInicial)
    setError('')
    setMensaje('')
    setModalAbierto(true)
  }

  const abrirEditarEmpleado = (empleado) => {
    setEmpleadoEditando(empleado)

    const departamentoId =
      empleado.departmentId ??
      empleado.department?.id ??
      empleado.id_department ??
      empleado.id_departamento ??
      ''

    /*
      RF-02 define la ficha completa del empleado.
      Conservamos todos sus campos visibles al editar.

      GET /employees puede devolver información resumida, por lo que los
      campos que la API no incluya se mostrarán vacíos en lugar de inventar
      información.

      El PUT documentado actualmente permite modificar position y status.
      Por eso los demás campos se muestran como parte de la ficha, pero no
      se envían al backend hasta que exista soporte documentado para editarlos.
    */
    setFormulario({
      employeeCode:
        empleado.employeeCode ||
        empleado.code ||
        '',
      fullName:
        empleado.fullName ||
        empleado.name ||
        '',
      identificationCard:
        empleado.identificationCard ||
        empleado.identification ||
        empleado.cedula ||
        '',
      departmentId: String(departamentoId),
      position:
        empleado.position ||
        empleado.cargo ||
        '',
      email:
        empleado.email ||
        empleado.correo ||
        '',
      mobilePhone:
        empleado.mobilePhone ||
        empleado.phone ||
        empleado.telefono ||
        '',
      status: empleado.status || 'Activo',
    })

    setError('')
    setMensaje('')
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    if (guardando) {
      return
    }

    setModalAbierto(false)
    setEmpleadoEditando(null)
    setFormulario(formularioInicial)
    setError('')
  }

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  const validarCreacion = () => {
    if (!formulario.employeeCode.trim()) {
      return 'El código del empleado es obligatorio.'
    }

    if (!formulario.fullName.trim()) {
      return 'El nombre completo es obligatorio.'
    }

    if (!formulario.identificationCard.trim()) {
      return 'La identificación es obligatoria.'
    }

    if (!formulario.departmentId) {
      return 'Debes seleccionar un departamento.'
    }

    if (!formulario.position.trim()) {
      return 'El cargo es obligatorio.'
    }

    if (!formulario.email.trim()) {
      return 'El correo es obligatorio.'
    }

    if (!formulario.mobilePhone.trim()) {
      return 'El teléfono móvil es obligatorio.'
    }

    return ''
  }

  const validarEdicion = () => {
    if (!formulario.position.trim()) {
      return 'El cargo es obligatorio.'
    }

    if (!formulario.status) {
      return 'El estado es obligatorio.'
    }

    return ''
  }

  const guardarEmpleado = async (evento) => {
    evento.preventDefault()

    const editando = Boolean(empleadoEditando)

    const errorValidacion = editando
      ? validarEdicion()
      : validarCreacion()

    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setGuardando(true)
    setError('')
    setMensaje('')

    /*
      POST y PUT utilizan contratos diferentes.

      POST:
      se envía el registro completo.

      PUT:
      solamente se envían position y status,
      que son los campos documentados para modificación.
    */
    const payload = editando
      ? {
          position: formulario.position.trim(),
          status: formulario.status,
        }
      : {
          employeeCode: formulario.employeeCode.trim(),
          fullName: formulario.fullName.trim(),
          identificationCard:
            formulario.identificationCard.trim(),
          departmentId: Number(formulario.departmentId),
          position: formulario.position.trim(),
          email: formulario.email.trim(),
          mobilePhone: formulario.mobilePhone.trim(),
          status: formulario.status,
        }

    const url = editando
      ? `${API_BASE_URL}/employees/${empleadoEditando.id}`
      : `${API_BASE_URL}/employees`

    try {
      const response = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: obtenerHeaders(true),
        body: JSON.stringify(payload),
      })

      const resultado = await leerRespuesta(response)

      if (!response.ok || resultado?.success === false) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            resultado?.mensaje ||
            `No fue posible guardar el empleado. Código HTTP ${response.status}.`
        )
      }

      setMensaje(
        editando
          ? 'Empleado actualizado correctamente.'
          : 'Empleado registrado correctamente.'
      )

      setModalAbierto(false)
      setEmpleadoEditando(null)
      setFormulario(formularioInicial)

      await cargarDatos()
    } catch (err) {
      console.error('Error guardando empleado:', err)

      setError(
        err.message ||
          'No fue posible guardar el empleado.'
      )
    } finally {
      setGuardando(false)
    }
  }

  const activos = empleados.filter(
    (empleado) =>
      String(empleado.status).toLowerCase() === 'activo'
  ).length

  const inactivos = empleados.length - activos

  const claseEstado = (estado) => {
    if (String(estado).toLowerCase() === 'activo') {
      return 'bg-green-100 text-green-700'
    }

    return 'bg-red-100 text-red-700'
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Empleados
            </h1>

            <p className="text-slate-500 mt-2">
              Registro y administración de empleados
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNuevoEmpleado}
            disabled={usuarioLoggeadoRol == "Audiencia" ? true : false}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition-colors"
          >
            <Plus size={20} />
            Nuevo empleado
          </button>
        </div>

        {error && !modalAbierto && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3">
            <AlertCircle
              size={22}
              className="shrink-0 mt-0.5"
            />

            <div>
              <p className="font-semibold">
                No se pudo completar la operación
              </p>

              <p className="text-sm mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {mensaje && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl">
            {mensaje}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total de empleados
            </p>

            <p className="text-3xl font-bold text-slate-800 mt-2">
              {cargando ? '-' : empleados.length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Activos
            </p>

            <p className="text-3xl font-bold text-green-600 mt-2">
              {cargando ? '-' : activos}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Inactivos
            </p>

            <p className="text-3xl font-bold text-red-600 mt-2">
              {cargando ? '-' : inactivos}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full max-w-md">
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
                placeholder="Buscar empleado..."
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
                className={
                  cargando ? 'animate-spin' : ''
                }
              />

              Actualizar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Código
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Nombre
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Departamento
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Estado
                  </th>

                  <th className="text-right px-5 py-4 text-sm font-semibold text-slate-600">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="py-12 text-center"
                    >
                      <Loader2
                        size={32}
                        className="animate-spin text-blue-600 mx-auto mb-3"
                      />

                      <p className="text-slate-500">
                        Cargando empleados...
                      </p>
                    </td>
                  </tr>
                ) : empleadosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="py-12 text-center text-slate-500"
                    >
                      No se encontraron empleados.
                    </td>
                  </tr>
                ) : (
                  empleadosFiltrados.map((empleado) => (
                    <tr
                      key={empleado.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-medium text-slate-800 whitespace-nowrap">
                        {empleado.employeeCode || '—'}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {empleado.fullName || '—'}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {empleado.department?.name ||
                          empleado.departmentName ||
                          '—'}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${claseEstado(
                            empleado.status
                          )}`}
                        >
                          {empleado.status ||
                            'Sin estado'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={usuarioLoggeadoRol == "Audiencia" ? true : false}
                            onClick={() =>
                              abrirEditarEmpleado(
                                empleado
                              )
                            }
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Editar empleado"
                          >
                            <Pencil size={18} />
                          </button>

                          {String(
                            empleado.status
                          ).toLowerCase() ===
                          'activo' ? (
                            <span
                              className="p-2 text-green-600"
                              title="Empleado activo"
                            >
                              <UserCheck
                                size={18}
                              />
                            </span>
                          ) : (
                            <span
                              className="p-2 text-red-600"
                              title="Empleado inactivo"
                            >
                              <UserX size={18} />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modalAbierto && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {empleadoEditando
                      ? 'Editar empleado'
                      : 'Nuevo empleado'}
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    {empleadoEditando
                      ? `${empleadoEditando.employeeCode || ''} - ${empleadoEditando.fullName || ''}`
                      : 'Completa la información del empleado.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrarModal}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                >
                  <X size={22} />
                </button>
              </div>

              <form
                onSubmit={guardarEmpleado}
                className="p-6"
              >
                {error && (
                  <div className="mb-5 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3">
                    <AlertCircle
                      size={21}
                      className="shrink-0"
                    />

                    <p className="text-sm">
                      {error}
                    </p>
                  </div>
                )}

                {empleadoEditando ? (
                  /*
                    EDICIÓN:
                    RF-02 conserva visible la ficha completa del empleado.
                    El contrato PUT actual solo permite guardar Cargo y Estado;
                    los demás campos se muestran sin eliminar información de la interfaz.
                  */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Código del empleado
                      </label>

                      <input
                        type="text"
                        name="employeeCode"
                        readOnly
                        value={
                          formulario.employeeCode
                        }
                        onChange={actualizarCampo}
                        placeholder="Ej. EMP-1031"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nombre completo
                      </label>

                      <input
                        type="text"
                        name="fullName"
                        readOnly
                        value={formulario.fullName}
                        onChange={actualizarCampo}
                        placeholder="Nombre y apellido"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Cédula / identificación
                      </label>

                      <input
                        type="text"
                        name="identificationCard"
                        readOnly
                        value={
                          formulario.identificationCard
                        }
                        onChange={actualizarCampo}
                        placeholder="Documento de identidad"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Departamento
                      </label>

                      <select
                        name="departmentId"
                        disabled
                        value={
                          formulario.departmentId
                        }
                        onChange={actualizarCampo}
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">
                          Selecciona un departamento
                        </option>

                        {departamentos.map(
                          (departamento) => (
                            <option
                              key={
                                departamento.id
                              }
                              value={
                                departamento.id
                              }
                            >
                              {departamento.code
                                ? `${departamento.code} - ${departamento.name}`
                                : departamento.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Cargo
                      </label>

                      <input
                        type="text"
                        name="position"
                        value={formulario.position}
                        onChange={actualizarCampo}
                        placeholder="Cargo del empleado"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Correo electrónico
                      </label>

                      <input
                        type="email"
                        name="email"
                        readOnly
                        value={formulario.email}
                        onChange={actualizarCampo}
                        placeholder="correo@ejemplo.com"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Teléfono móvil
                      </label>

                      <input
                        type="text"
                        name="mobilePhone"
                        readOnly
                        value={
                          formulario.mobilePhone
                        }
                        onChange={actualizarCampo}
                        placeholder="809-000-0000"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Estado
                      </label>

                      <select
                        name="status"
                        value={formulario.status}
                        onChange={actualizarCampo}
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="Activo">
                          Activo
                        </option>

                        <option value="Inactivo">
                          Inactivo
                        </option>
                      </select>
                    </div>
                  </div>
                ) : (
                  /*
                    CREACIÓN:
                    POST /employees requiere el registro
                    completo del empleado.
                  */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Código del empleado
                      </label>

                      <input
                        type="text"
                        name="employeeCode"
                        value={
                          formulario.employeeCode
                        }
                        onChange={actualizarCampo}
                        placeholder="Ej. EMP-1031"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nombre completo
                      </label>

                      <input
                        type="text"
                        name="fullName"
                        value={formulario.fullName}
                        onChange={actualizarCampo}
                        placeholder="Nombre y apellido"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Cédula / identificación
                      </label>

                      <input
                        type="text"
                        name="identificationCard"
                        value={
                          formulario.identificationCard
                        }
                        onChange={actualizarCampo}
                        placeholder="Documento de identidad"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Departamento
                      </label>

                      <select
                        name="departmentId"
                        value={
                          formulario.departmentId
                        }
                        onChange={actualizarCampo}
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">
                          Selecciona un departamento
                        </option>

                        {departamentos.map(
                          (departamento) => (
                            <option
                              key={
                                departamento.id
                              }
                              value={
                                departamento.id
                              }
                            >
                              {departamento.code
                                ? `${departamento.code} - ${departamento.name}`
                                : departamento.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Cargo
                      </label>

                      <input
                        type="text"
                        name="position"
                        value={formulario.position}
                        onChange={actualizarCampo}
                        placeholder="Cargo del empleado"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Correo electrónico
                      </label>

                      <input
                        type="email"
                        name="email"
                        value={formulario.email}
                        onChange={actualizarCampo}
                        placeholder="correo@ejemplo.com"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Teléfono móvil
                      </label>

                      <input
                        type="text"
                        name="mobilePhone"
                        value={
                          formulario.mobilePhone
                        }
                        onChange={actualizarCampo}
                        placeholder="809-000-0000"
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Estado
                      </label>

                      <select
                        name="status"
                        value={formulario.status}
                        onChange={actualizarCampo}
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="Activo">
                          Activo
                        </option>

                        <option value="Inactivo">
                          Inactivo
                        </option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-7 pt-5 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    disabled={guardando}
                    className="px-5 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      guardando ||
                      (!empleadoEditando &&
                        departamentos.length === 0)
                    }
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {guardando && (
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                    )}

                    {empleadoEditando
                      ? 'Guardar cambios'
                      : 'Registrar empleado'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default Empleados
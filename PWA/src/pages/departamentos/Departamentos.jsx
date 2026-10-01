import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Pencil,
  Building2,
  Users,
  Car,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

import AdminLayout from '../../components/layouts/AdminLayout'
import { API_BASE_URL } from '../../App.jsx'

const formularioInicial = {
  code: '',
  name: '',
  description: '',
}

const usuarioLoggeadoRol = JSON.parse(localStorage.getItem("fuelcontrol_usuario")).rol;

function Departamentos() {
  const [departamentos, setDepartamentos] = useState([])
  const [busqueda, setBusqueda] = useState('')

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [departamentoEditando, setDepartamentoEditando] = useState(null)
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
      success: false,
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

  const cargarDepartamentos = async () => {
    setCargando(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/departments`, {
        method: 'GET',
        headers: obtenerHeaders(),
      })

      const resultado = await leerRespuesta(response)

      if (!response.ok) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            resultado?.mensaje ||
            `No fue posible cargar los departamentos. Código HTTP ${response.status}.`
        )
      }

      setDepartamentos(obtenerLista(resultado))
    } catch (err) {
      console.error('Error cargando departamentos:', err)

      setError(
        err.message ||
          'No fue posible cargar los departamentos.'
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDepartamentos()
  }, [])

  const departamentosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) {
      return departamentos
    }

    return departamentos.filter((departamento) => {
      return [
        departamento.code,
        departamento.name,
        departamento.description,
      ].some((valor) =>
        String(valor ?? '')
          .toLowerCase()
          .includes(texto)
      )
    })
  }, [departamentos, busqueda])

  const totalEmpleados = departamentos.reduce(
    (total, departamento) =>
      total + Number(departamento.employeeCount || 0),
    0
  )

  const totalVehiculos = departamentos.reduce(
    (total, departamento) =>
      total + Number(departamento.vehicleCount || 0),
    0
  )

  const abrirNuevoDepartamento = () => {
    setDepartamentoEditando(null)
    setFormulario(formularioInicial)
    setError('')
    setMensaje('')
    setMostrarFormulario(true)
  }

  const abrirEditarDepartamento = (departamento) => {
    setDepartamentoEditando(departamento)

    setFormulario({
      code: departamento.code || '',
      name: departamento.name || '',
      description: departamento.description || '',
    })

    setError('')
    setMensaje('')
    setMostrarFormulario(true)
  }

  const cerrarFormulario = () => {
    if (guardando) {
      return
    }

    setMostrarFormulario(false)
    setDepartamentoEditando(null)
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

  const guardarDepartamento = async (evento) => {
    evento.preventDefault()

    if (!formulario.name.trim()) {
      setError('El nombre del departamento es obligatorio.')
      return
    }

    if (!departamentoEditando && !formulario.code.trim()) {
      setError('El código del departamento es obligatorio.')
      return
    }

    setGuardando(true)
    setError('')
    setMensaje('')

    const esEdicion = Boolean(departamentoEditando)

    /*
      Según el contrato de API:
      POST /departments:
      {
        code,
        name,
        description
      }

      PUT /departments/:id permite modificar
      los datos del departamento.

      No se incluyen empleados ni vehículos manualmente.
      Esas cantidades vienen calculadas por el backend.
    */
    const payload = esEdicion
      ? {
          name: formulario.name.trim(),
        }
      : {
          code: formulario.code.trim(),
          name: formulario.name.trim(),
          description: formulario.description.trim(),
        }

    const url = esEdicion
      ? `${API_BASE_URL}/departments/${departamentoEditando.id}`
      : `${API_BASE_URL}/departments`

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
            `No fue posible guardar el departamento. Código HTTP ${response.status}.`
        )
      }

      setMostrarFormulario(false)
      setDepartamentoEditando(null)
      setFormulario(formularioInicial)

      setMensaje(
        esEdicion
          ? 'Departamento actualizado correctamente.'
          : 'Departamento registrado correctamente.'
      )

      await cargarDepartamentos()
    } catch (err) {
      console.error('Error guardando departamento:', err)

      setError(
        err.message ||
          'No fue posible guardar el departamento.'
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Gestión de Departamentos
            </h1>

            <p className="text-slate-500 mt-2">
              Administración de departamentos de la institución
            </p>
          </div>

          <button
            type="button"
            disabled={usuarioLoggeadoRol == "Audiencia" ? true : false}
            onClick={abrirNuevoDepartamento}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition-colors"
          >
            <Plus size={20} />
            Nuevo departamento
          </button>
        </div>

        {error && !mostrarFormulario && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Departamentos
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {cargando ? '-' : departamentos.length}
                </p>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <Building2 size={25} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Empleados asociados
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {cargando ? '-' : totalEmpleados}
                </p>
              </div>

              <div className="p-3 bg-cyan-50 rounded-xl text-cyan-600">
                <Users size={25} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Vehículos asociados
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {cargando ? '-' : totalVehiculos}
                </p>
              </div>

              <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
                <Car size={25} />
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
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar departamento..."
                className="w-full border border-slate-300 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={cargarDepartamentos}
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
                    Código
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Departamento
                  </th>

                  <th className="text-center px-5 py-4 text-sm font-semibold text-slate-600">
                    Empleados
                  </th>

                  <th className="text-center px-5 py-4 text-sm font-semibold text-slate-600">
                    Vehículos
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
                      className="text-center py-12"
                    >
                      <Loader2
                        size={32}
                        className="animate-spin text-blue-600 mx-auto mb-3"
                      />

                      <p className="text-slate-500">
                        Cargando departamentos...
                      </p>
                    </td>
                  </tr>
                ) : departamentosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-12 text-slate-500"
                    >
                      No se encontraron departamentos.
                    </td>
                  </tr>
                ) : (
                  departamentosFiltrados.map((departamento) => (
                    <tr
                      key={departamento.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-blue-700 whitespace-nowrap">
                        {departamento.code || '—'}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Building2 size={19} />
                          </div>

                          <div>
                            <p className="font-medium text-slate-800">
                              {departamento.name || 'Sin nombre'}
                            </p>

                            {departamento.description && (
                              <p className="text-sm text-slate-500 mt-1">
                                {departamento.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <Users
                            size={17}
                            className="text-slate-400"
                          />

                          {Number(
                            departamento.employeeCount || 0
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <Car
                            size={17}
                            className="text-slate-400"
                          />

                          {Number(
                            departamento.vehicleCount || 0
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={usuarioLoggeadoRol == "Audiencia" ? true : false}
                            onClick={() =>
                              abrirEditarDepartamento(departamento)
                            }
                            title="Editar departamento"
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil size={18} />
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {departamentoEditando
                    ? 'Editar departamento'
                    : 'Nuevo departamento'}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {departamentoEditando
                    ? 'Modifica la información del departamento'
                    : 'Registra un departamento en el sistema'}
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
              onSubmit={guardarDepartamento}
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

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Código
                  </label>

                  <input
                    type="text"
                    name="code"
                    value={formulario.code}
                    onChange={manejarCambio}
                    disabled={Boolean(departamentoEditando)}
                    placeholder="Ej. DPT-TI"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                  />

                  {departamentoEditando && (
                    <p className="text-xs text-slate-500 mt-2">
                      El contrato de modificación confirmado utiliza
                      el nombre del departamento.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={formulario.name}
                    onChange={manejarCambio}
                    placeholder="Ej. Tecnología y Sistemas"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {!departamentoEditando && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Descripción
                    </label>

                    <textarea
                      name="description"
                      value={formulario.description}
                      onChange={manejarCambio}
                      rows="4"
                      placeholder="Descripción del departamento"
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}

                {departamentoEditando && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-xs text-slate-500">
                        Empleados asociados
                      </p>

                      <p className="text-2xl font-bold text-slate-800 mt-1">
                        {Number(
                          departamentoEditando.employeeCount || 0
                        )}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-xs text-slate-500">
                        Vehículos asociados
                      </p>

                      <p className="text-2xl font-bold text-slate-800 mt-1">
                        {Number(
                          departamentoEditando.vehicleCount || 0
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {guardando && (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  )}

                  {departamentoEditando
                    ? 'Guardar cambios'
                    : 'Registrar departamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Departamentos
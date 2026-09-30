import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Pencil,
  CarFront,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

import AdminLayout from '../../components/layouts/AdminLayout'
import { API_BASE_URL } from '../../App.jsx'

const formularioInicial = {
  licensePlate: '',
  internalCode: '',
  brand: '',
  model: '',
  year: '',
  type: '',
  departmentId: '',
  tankCapacityGal: '',
  odometerKm: '',
  status: 'Activo',
}

function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([])
  const [departamentos, setDepartamentos] = useState([])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [busqueda, setBusqueda] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [vehiculoEditando, setVehiculoEditando] = useState(null)
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

  const cargarDatos = async () => {
    setCargando(true)
    setError('')

    try {
      const [respuestaVehiculos, respuestaDepartamentos] =
        await Promise.all([
          fetch(`${API_BASE_URL}/vehicles`, {
            method: 'GET',
            headers: obtenerHeaders(),
          }),
          fetch(`${API_BASE_URL}/departments`, {
            method: 'GET',
            headers: obtenerHeaders(),
          }),
        ])

      const [resultadoVehiculos, resultadoDepartamentos] =
        await Promise.all([
          leerRespuesta(respuestaVehiculos),
          leerRespuesta(respuestaDepartamentos),
        ])

      if (!respuestaVehiculos.ok) {
        throw new Error(
          resultadoVehiculos?.error ||
            resultadoVehiculos?.message ||
            resultadoVehiculos?.mensaje ||
            `No fue posible cargar los vehículos. Código HTTP ${respuestaVehiculos.status}.`
        )
      }

      if (!respuestaDepartamentos.ok) {
        throw new Error(
          resultadoDepartamentos?.error ||
            resultadoDepartamentos?.message ||
            resultadoDepartamentos?.mensaje ||
            `No fue posible cargar los departamentos. Código HTTP ${respuestaDepartamentos.status}.`
        )
      }

      setVehiculos(obtenerLista(resultadoVehiculos))
      setDepartamentos(obtenerLista(resultadoDepartamentos))
    } catch (err) {
      console.error('Error cargando vehículos:', err)

      setError(
        err.message ||
          'No fue posible cargar la información de vehículos.'
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const obtenerNombreDepartamento = (vehiculo) => {
    if (
      vehiculo?.department &&
      typeof vehiculo.department === 'object'
    ) {
      return vehiculo.department.name || '—'
    }

    return (
      vehiculo?.department ||
      vehiculo?.departmentName ||
      '—'
    )
  }

  const obtenerEstado = (vehiculo) => {
    if (vehiculo?.status) {
      return vehiculo.status
    }

    if (typeof vehiculo?.isActive === 'boolean') {
      return vehiculo.isActive ? 'Activo' : 'Inactivo'
    }

    return 'Sin estado'
  }

  const vehiculosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) {
      return vehiculos
    }

    return vehiculos.filter((vehiculo) => {
      const valores = [
        vehiculo.licensePlate,
        vehiculo.internalCode,
        vehiculo.vehicleCode,
        vehiculo.brand,
        vehiculo.make,
        vehiculo.model,
        vehiculo.type,
        vehiculo.vehicleType,
        obtenerNombreDepartamento(vehiculo),
        obtenerEstado(vehiculo),
      ]

      return valores.some((valor) =>
        String(valor ?? '')
          .toLowerCase()
          .includes(texto)
      )
    })
  }, [vehiculos, busqueda])

  const abrirNuevoVehiculo = () => {
    setVehiculoEditando(null)
    setFormulario(formularioInicial)
    setError('')
    setMensaje('')
    setMostrarFormulario(true)
  }

  const abrirEditarVehiculo = (vehiculo) => {
    let departmentId = ''

    if (
      vehiculo.department &&
      typeof vehiculo.department === 'object'
    ) {
      departmentId = vehiculo.department.id || ''
    } else if (vehiculo.departmentId) {
      departmentId = vehiculo.departmentId
    } else if (typeof vehiculo.department === 'string') {
      const departamentoEncontrado = departamentos.find(
        (departamento) =>
          departamento.name === vehiculo.department
      )

      departmentId = departamentoEncontrado?.id || ''
    }

    setVehiculoEditando(vehiculo)

    setFormulario({
      licensePlate:
        vehiculo.licensePlate ||
        vehiculo.plate ||
        '',

      internalCode:
        vehiculo.internalCode ||
        vehiculo.vehicleCode ||
        vehiculo.code ||
        '',

      brand:
        vehiculo.brand ||
        vehiculo.make ||
        '',

      model:
        vehiculo.model ||
        '',

      year:
        vehiculo.year ||
        '',

      type:
        vehiculo.type ||
        vehiculo.vehicleType ||
        '',

      departmentId: String(departmentId),

      tankCapacityGal:
        vehiculo.tankCapacityGal ??
        vehiculo.tankCapacityGallons ??
        vehiculo.tankCapacity ??
        '',

      odometerKm:
        vehiculo.odometerKm ??
        vehiculo.odometer ??
        vehiculo.mileage ??
        '',

      status: obtenerEstado(vehiculo),
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
    setVehiculoEditando(null)
    setFormulario(formularioInicial)
  }

  const manejarCambio = (evento) => {
    const { name, value } = evento.target

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  const validarFormulario = () => {
    if (!formulario.licensePlate.trim()) {
      return 'La placa es obligatoria.'
    }

    if (!formulario.internalCode.trim()) {
      return 'La ficha o código interno es obligatorio.'
    }

    if (!formulario.brand.trim()) {
      return 'La marca es obligatoria.'
    }

    if (!formulario.model.trim()) {
      return 'El modelo es obligatorio.'
    }

    if (!formulario.year) {
      return 'El año es obligatorio.'
    }

    if (!formulario.type.trim()) {
      return 'El tipo de vehículo es obligatorio.'
    }

    if (!formulario.departmentId) {
      return 'Debes seleccionar un departamento.'
    }

    if (
      !formulario.tankCapacityGal ||
      Number(formulario.tankCapacityGal) <= 0
    ) {
      return 'La capacidad del tanque debe ser mayor que cero.'
    }

    if (
      formulario.odometerKm === '' ||
      Number(formulario.odometerKm) < 0
    ) {
      return 'El odómetro no puede ser negativo.'
    }

    return ''
  }

  const guardarVehiculo = async (evento) => {
    evento.preventDefault()

    const errorValidacion = validarFormulario()

    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setGuardando(true)
    setError('')
    setMensaje('')

    /*
      Payload preparado según el contrato revisado del proyecto.

      No contiene datos mock.

      La lectura de /vehicles ya fue validada contra la API real.
      La escritura POST/PUT todavía no se prueba con datos ficticios.
    */
    const payload = {
      licensePlate: formulario.licensePlate.trim(),
      internalCode: formulario.internalCode.trim(),
      brand: formulario.brand.trim(),
      model: formulario.model.trim(),
      year: Number(formulario.year),
      type: formulario.type.trim(),
      departmentId: Number(formulario.departmentId),
      tankCapacityGal: Number(formulario.tankCapacityGal),
      odometerKm: Number(formulario.odometerKm),
      status: (formulario.status.toLowerCase() == 'Activo') ? true : false,
    }

    try {
      const esEdicion = Boolean(vehiculoEditando)

      const url = esEdicion
        ? `${API_BASE_URL}/vehicles/${vehiculoEditando.id}`
        : `${API_BASE_URL}/vehicles`

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
            `No fue posible guardar el vehículo. Código HTTP ${response.status}.`
        )
      }

      setMensaje(
        esEdicion
          ? 'Vehículo actualizado correctamente.'
          : 'Vehículo registrado correctamente.'
      )

      setMostrarFormulario(false)
      setVehiculoEditando(null)
      setFormulario(formularioInicial)

      await cargarDatos()
    } catch (err) {
      console.error('Error guardando vehículo:', err)

      setError(
        err.message ||
          'No fue posible guardar el vehículo.'
      )
    } finally {
      setGuardando(false)
    }
  }

  const claseEstado = (estado) => {
    const valor = String(estado ?? '').toLowerCase()

    if (valor === 'activo') {
      return 'bg-green-100 text-green-700'
    }

    if (
      valor.includes('reparación') ||
      valor.includes('reparacion') ||
      valor.includes('mantenimiento')
    ) {
      return 'bg-amber-100 text-amber-700'
    }

    if (
      valor === 'inactivo' ||
      valor === 'fuera de servicio'
    ) {
      return 'bg-red-100 text-red-700'
    }

    return 'bg-slate-100 text-slate-700'
  }

  const activos = vehiculos.filter(
    (vehiculo) =>
      obtenerEstado(vehiculo).toLowerCase() === 'activo'
  ).length

  const Inactivo = vehiculos.filter(
    (vehiculo) =>
      obtenerEstado(vehiculo).toLowerCase() === 'inactivo'
  ).length

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Gestión de Vehículos
            </h1>

            <p className="text-slate-500 mt-2">
              Administración de vehículos registrados en el sistema
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNuevoVehiculo}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition-colors"
          >
            <Plus size={20} />
            Nuevo vehículo
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
            <p className="text-sm text-slate-500">
              Total de vehículos
            </p>

            <p className="text-3xl font-bold text-slate-800 mt-2">
              {cargando ? '-' : vehiculos.length}
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

            <p className="text-3xl font-bold text-amber-600 mt-2">
              {cargando ? '-' : Inactivo}
            </p>
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
                placeholder="Buscar vehículo..."
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
                    Ficha
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Placa
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Vehículo
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Tipo
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Departamento
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Odómetro
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
                      colSpan="8"
                      className="text-center py-12"
                    >
                      <Loader2
                        size={32}
                        className="animate-spin text-blue-600 mx-auto mb-3"
                      />

                      <p className="text-slate-500">
                        Cargando vehículos...
                      </p>
                    </td>
                  </tr>
                ) : vehiculosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-12 text-slate-500"
                    >
                      No se encontraron vehículos.
                    </td>
                  </tr>
                ) : (
                  vehiculosFiltrados.map((vehiculo) => {
                    const marca =
                      vehiculo.brand ||
                      vehiculo.make ||
                      ''

                    const modelo = vehiculo.model || ''
                    const anio = vehiculo.year || ''

                    const tieneDetalle =
                      marca || modelo || anio

                    const odometro =
                      vehiculo.odometerKm ??
                      vehiculo.odometer ??
                      vehiculo.mileage

                    const estado = obtenerEstado(vehiculo)

                    return (
                      <tr
                        key={vehiculo.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 text-sm font-medium text-slate-800 whitespace-nowrap">
                          {vehiculo.internalCode ||
                            vehiculo.vehicleCode ||
                            vehiculo.code ||
                            '—'}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {vehiculo.licensePlate ||
                            vehiculo.plate ||
                            '—'}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          {tieneDetalle ? (
                            <>
                              <p className="font-medium text-slate-800">
                                {[marca, modelo]
                                  .filter(Boolean)
                                  .join(' ') || '—'}
                              </p>

                              {anio && (
                                <p className="text-sm text-slate-500">
                                  Año {anio}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400">
                              No incluido en el listado
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {vehiculo.type ||
                            vehiculo.vehicleType ||
                            '—'}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {obtenerNombreDepartamento(vehiculo)}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {odometro !== undefined &&
                          odometro !== null ? (
                            `${Number(odometro).toLocaleString()} km`
                          ) : (
                            <span className="text-slate-400">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${claseEstado(
                              estado
                            )}`}
                          >
                            {estado}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                abrirEditarVehiculo(vehiculo)
                              }
                              title="Editar vehículo"
                              className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Pencil size={18} />
                            </button>

                            <span
                              title={`Estado actual: ${estado}`}
                              className="p-2 rounded-lg text-slate-500"
                            >
                              <CarFront size={18} />
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {vehiculoEditando
                    ? 'Editar vehículo'
                    : 'Nuevo vehículo'}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Complete la información del vehículo
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarFormulario}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={guardarVehiculo}
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

              {vehiculoEditando && (
                <div className="mb-5 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
                  El listado actual de la API no devuelve todos los
                  detalles del vehículo. Verifica los campos antes de
                  guardar una edición.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Placa
                  </label>

                  <input
                    type="text"
                    name="licensePlate"
                    value={formulario.licensePlate}
                    onChange={manejarCambio}
                    placeholder="Ej. L123456"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ficha (código interno)
                  </label>

                  <input
                    type="text"
                    name="internalCode"
                    value={formulario.internalCode}
                    onChange={manejarCambio}
                    placeholder="Ej. V-001"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Marca
                  </label>

                  <input
                    type="text"
                    name="brand"
                    value={formulario.brand}
                    onChange={manejarCambio}
                    placeholder="Marca del vehículo"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Modelo
                  </label>

                  <input
                    type="text"
                    name="model"
                    value={formulario.model}
                    onChange={manejarCambio}
                    placeholder="Modelo del vehículo"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Año
                  </label>

                  <input
                    type="number"
                    name="year"
                    value={formulario.year}
                    onChange={manejarCambio}
                    min="1900"
                    max="2100"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo
                  </label>

                  <input
                    type="text"
                    name="type"
                    value={formulario.type}
                    onChange={manejarCambio}
                    placeholder="Ej. Camioneta"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Departamento
                  </label>

                  <select
                    name="departmentId"
                    value={formulario.departmentId}
                    onChange={manejarCambio}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">
                      Selecciona un departamento
                    </option>

                    {departamentos.map((departamento) => (
                      <option
                        key={departamento.id}
                        value={departamento.id}
                      >
                        {departamento.code
                          ? `${departamento.code} - ${departamento.name}`
                          : departamento.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Capacidad del tanque
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      name="tankCapacityGal"
                      value={formulario.tankCapacityGal}
                      onChange={manejarCambio}
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      galones
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Kilómetros (odómetro)
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="odometerKm"
                      value={formulario.odometerKm}
                      onChange={manejarCambio}
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      km
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Estado
                  </label>

                  <select
                    name="status"
                    value={formulario.status}
                    onChange={manejarCambio}
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

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-8 pt-5 border-t border-slate-200">
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
                  disabled={
                    guardando ||
                    departamentos.length === 0
                  }
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {guardando && (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  )}

                  {vehiculoEditando
                    ? 'Guardar cambios'
                    : 'Registrar vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Vehiculos
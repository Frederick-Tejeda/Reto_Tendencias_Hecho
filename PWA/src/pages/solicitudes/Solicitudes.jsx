import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Fuel,
  X,
  CalendarDays,
  Clock,
  Repeat,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

import AdminLayout from '../../components/layouts/AdminLayout'
import { API_BASE_URL } from '../../App.jsx'

const usuarioLoggeadoRol = JSON.parse(localStorage.getItem("fuelcontrol_usuario"))?.rol;

function Solicitudes() {
  const crearFormularioVacio = () => ({
    tipoSolicitud: 'Manual',
    empleadoId: '',
    vehiculoId: '',
    departamentoId: '',
    cantidad: '',
    tipoCombustible: 'Gasolina',
    fechaSolicitud: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    frecuencia: '',
    diaSemana: '',
    fechaInicio: '',
    fechaFin: '',
  })

  const [solicitudes, setSolicitudes] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [departamentos, setDepartamentos] = useState([])

  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)

  const [errorApi, setErrorApi] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [formulario, setFormulario] = useState(crearFormularioVacio())

  const obtenerToken = () => {
    return localStorage.getItem('fuelcontrol_token')
  }

  const obtenerHeaders = () => {
    const token = obtenerToken()

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  const leerRespuesta = async (response) => {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  const normalizarLista = (resultado) => {
    if (Array.isArray(resultado)) {
      return resultado
    }

    if (Array.isArray(resultado?.data)) {
      return resultado.data
    }

    if (Array.isArray(resultado?.data?.items)) {
      return resultado.data.items
    }

    return []
  }

  const cargarDatos = async () => {
    setCargando(true)
    setErrorApi('')

    try {
      const headers = obtenerHeaders()

      const [
        respuestaSolicitudes,
        respuestaEmpleados,
        respuestaVehiculos,
        respuestaDepartamentos,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/requests`, { headers }),
        fetch(`${API_BASE_URL}/employees`, { headers }),
        fetch(`${API_BASE_URL}/vehicles`, { headers }),
        fetch(`${API_BASE_URL}/departments`, { headers }),
      ])

      const [
        datosSolicitudes,
        datosEmpleados,
        datosVehiculos,
        datosDepartamentos,
      ] = await Promise.all([
        leerRespuesta(respuestaSolicitudes),
        leerRespuesta(respuestaEmpleados),
        leerRespuesta(respuestaVehiculos),
        leerRespuesta(respuestaDepartamentos),
      ])

      /*
       * SOLICITUDES
       */
      if (respuestaSolicitudes.ok) {
        const lista = normalizarLista(datosSolicitudes)

        const solicitudesMapeadas = lista.map((solicitud) => ({
          id:
            solicitud.requestId ??
            solicitud.id_solicitud ??
            solicitud.id ??
            '',

          numero:
            solicitud.sequentialId ??
            solicitud.requestCode ??
            solicitud.codigo ??
            (solicitud.requestId
              ? `SOL-${String(solicitud.requestId).padStart(4, '0')}`
              : 'Solicitud'),

          tipoSolicitud:
            solicitud.requestType ??
            solicitud.tipoSolicitud ??
            solicitud.tipo_solicitud ??
            'Manual',

          empleadoId:
            solicitud.employeeId ??
            solicitud.id_empleado ??
            '',

          empleado:
            solicitud.employeeName ??
            solicitud.empleado ??
            'No especificado',

          vehiculoId:
            solicitud.vehicleId ??
            solicitud.id_vehiculo ??
            '',

          vehiculo:
            solicitud.vehicleCode ??
            solicitud.ficha_interna ??
            solicitud.placa ??
            'No especificado',

          departamentoId:
            solicitud.departmentId ??
            solicitud.id_departamento ??
            '',

          departamento:
            solicitud.departmentName ??
            solicitud.department ??
            solicitud.departamento ??
            'No especificado',

          cantidad:
            solicitud.authorizedQuantityGal ??
            solicitud.cantidad_autorizada ??
            null,

          tipoCombustible:
            solicitud.fuelType ??
            solicitud.tipo_combustible ??
            'No especificado',

          fechaSolicitud:
            solicitud.requestDate ??
            solicitud.fecha_solicitud ??
            '',

          fechaVencimiento:
            solicitud.expirationDate ??
            solicitud.fecha_vencimiento ??
            '',

          estado:
            solicitud.status ??
            solicitud.estado ??
            'Sin estado',

          recurrencia:
            solicitud.recurrence ?? null,
        }))

        setSolicitudes(solicitudesMapeadas)
      } else {
        const mensaje =
          datosSolicitudes?.message ||
          datosSolicitudes?.mensaje ||
          `No fue posible cargar las solicitudes. Código HTTP ${respuestaSolicitudes.status}.`

        setSolicitudes([])
        setErrorApi(mensaje)
      }

      /*
       * EMPLEADOS
       */
      if (respuestaEmpleados.ok) {
        setEmpleados(normalizarLista(datosEmpleados))
      } else {
        setEmpleados([])
      }

      /*
       * VEHÍCULOS
       */
      if (respuestaVehiculos.ok) {
        setVehiculos(normalizarLista(datosVehiculos))
      } else {
        setVehiculos([])
      }

      /*
       * DEPARTAMENTOS
       */
      if (respuestaDepartamentos.ok) {
        setDepartamentos(normalizarLista(datosDepartamentos))
      } else {
        setDepartamentos([])
      }
    } catch (error) {
      console.error('Error cargando solicitudes:', error)

      setErrorApi(
        'No fue posible conectar correctamente con el servidor.'
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const formatearFecha = (fecha) => {
    if (!fecha) return '—'

    const texto = String(fecha)

    if (texto.includes('T')) {
      return texto.split('T')[0]
    }

    return texto
  }

  const solicitudesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) {
      return solicitudes
    }

    return solicitudes.filter((solicitud) => {
      return [
        solicitud.numero,
        solicitud.tipoSolicitud,
        solicitud.empleado,
        solicitud.vehiculo,
        solicitud.departamento,
        solicitud.tipoCombustible,
        solicitud.estado,
      ].some((valor) =>
        String(valor ?? '')
          .toLowerCase()
          .includes(texto)
      )
    })
  }, [solicitudes, busqueda])

  const abrirNuevaSolicitud = () => {
    setErrorApi('')
    setMensajeExito('')
    setFormulario(crearFormularioVacio())
    setMostrarFormulario(true)
  }

  const cerrarFormulario = () => {
    if (procesando) return

    setMostrarFormulario(false)
    setFormulario(crearFormularioVacio())
  }

  const manejarCambio = (e) => {
    const { name, value } = e.target

    console.log({ formulario, name, value })

    if (name === 'tipoSolicitud') {
      setFormulario((anterior) => ({
        ...anterior,
        tipoSolicitud: value,
        frecuencia: '',
        diaSemana: '',
        fechaInicio: '',
        fechaFin: '',
      }))

      return
    }

    if (name === 'empleadoId') {
      const empleadoSeleccionado = empleados.find(
        (empleado) => String(empleado.id) === String(value)
      )

      const departamentoEmpleado =
        empleadoSeleccionado?.department?.id ??
        empleadoSeleccionado?.departmentId ??
        empleadoSeleccionado?.id_departamento ??
        ''

      setFormulario((anterior) => ({
        ...anterior,
        empleadoId: value,
        departamentoId:
          departamentoEmpleado !== ''
            ? String(departamentoEmpleado)
            : anterior.departamentoId,
      }))

      return
    }

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  const validarFormulario = () => {
    if (
      !formulario.empleadoId ||
      !formulario.vehiculoId ||
      !formulario.departamentoId ||
      !formulario.cantidad ||
      !formulario.fechaSolicitud ||
      !formulario.fechaVencimiento
    ) {
      return 'Complete todos los campos obligatorios.'
    }

    const cantidad = Number(formulario.cantidad)

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return 'La cantidad autorizada debe ser mayor que cero.'
    }

    if (formulario.fechaVencimiento < formulario.fechaSolicitud) {
      return 'La fecha de vencimiento no puede ser anterior a la fecha de solicitud.'
    }

    if (formulario.tipoSolicitud === 'Recurrente') {
      if (
        !formulario.frecuencia ||
        formulario.diaSemana === '' ||
        !formulario.fechaInicio ||
        !formulario.fechaFin
      ) {
        return 'Complete todos los datos de recurrencia.'
      }

      if (formulario.fechaFin < formulario.fechaInicio) {
        return 'La fecha de fin no puede ser anterior a la fecha de inicio.'
      }
    }

    return ''
  }

  const convertirFechaUtc = (fecha, finDelDia = false) => {
    if (!fecha) return null

    if (finDelDia) {
      return `${fecha}T23:59:59Z`
    }

    return `${fecha}T00:00:00Z`
  }

  const guardarSolicitud = async (e) => {
    e.preventDefault()

    setErrorApi('')
    setMensajeExito('')

    const errorValidacion = validarFormulario()

    if (errorValidacion) {
      setErrorApi(errorValidacion)
      return
    }

    const payload = {
      employeeId: Number(formulario.empleadoId),
      vehicleId: Number(formulario.vehiculoId),
      departmentId: Number(formulario.departamentoId),
      authorizedQuantityGal: Number(formulario.cantidad),
      fuelType: formulario.tipoCombustible,
      requestType: formulario.tipoSolicitud,
      requestDate: convertirFechaUtc(formulario.fechaSolicitud),
      expirationDate: convertirFechaUtc(
        formulario.fechaVencimiento,
        true
      ),
    }

    if (formulario.tipoSolicitud === 'Recurrente') {
      payload.recurrence = {
        frequency: formulario.frecuencia,
        dayOfWeek: Number(formulario.diaSemana),
        startDate: convertirFechaUtc(formulario.fechaInicio),
        endDate: convertirFechaUtc(formulario.fechaFin, true),
      }
    }

    setProcesando(true)

    try {
      const response = await fetch(`${API_BASE_URL}/requests`, {
        method: 'POST',
        headers: obtenerHeaders(),
        body: JSON.stringify(payload),
      })

      const resultado = await leerRespuesta(response)

      if (!response.ok) {
        const mensaje =
          resultado?.message ||
          resultado?.mensaje ||
          `El servidor rechazó la solicitud. Código HTTP ${response.status}.`

        setErrorApi(mensaje)
        return
      }

      if (
        resultado &&
        resultado.success === false
      ) {
        setErrorApi(
          resultado.message ||
            resultado.mensaje ||
            'El servidor no pudo registrar la solicitud.'
        )

        return
      }

      setMostrarFormulario(false)
      setFormulario(crearFormularioVacio())

      setMensajeExito(
        resultado?.message ||
          resultado?.mensaje ||
          'Solicitud registrada correctamente.'
      )

      await cargarDatos()
    } catch (error) {
      console.error('Error registrando solicitud:', error)

      setErrorApi(
        'No fue posible conectar con el servidor para registrar la solicitud.'
      )
    } finally {
      setProcesando(false)
    }
  }

  const obtenerNombreEmpleado = (empleado) => {
    return (
      empleado.fullName ??
      empleado.name ??
      empleado.nombre ??
      'Empleado'
    )
  }

  const obtenerCodigoEmpleado = (empleado) => {
    return (
      empleado.employeeCode ??
      empleado.code ??
      empleado.codigo ??
      ''
    )
  }

  const obtenerNombreVehiculo = (vehiculo) => {
    const codigo =
      vehiculo.internalCode ??
      vehiculo.vehicleCode ??
      vehiculo.code ??
      ''

    const placa =
      vehiculo.licensePlate ??
      vehiculo.plate ??
      vehiculo.placa ??
      ''

    const modelo =
      vehiculo.model ??
      vehiculo.modelo ??
      ''

    return [codigo, placa, modelo]
      .filter(Boolean)
      .join(' · ')
  }

  const obtenerNombreDepartamento = (departamento) => {
    return (
      departamento.name ??
      departamento.nombre ??
      departamento.description ??
      `Departamento ${departamento.id}`
    )
  }

  const obtenerEstiloTipo = (tipo) => {
    if (tipo === 'Programada' || tipo === 'Automática') {
      return 'bg-amber-100 text-amber-700'
    }

    if (tipo === 'Recurrente') {
      return 'bg-purple-100 text-purple-700'
    }

    return 'bg-blue-100 text-blue-700'
  }

  const obtenerIconoTipo = (tipo) => {
    if (tipo === 'Programada' || tipo === 'Automática') {
      return <Clock size={14} />
    }

    if (tipo === 'Recurrente') {
      return <Repeat size={14} />
    }

    return <Fuel size={14} />
  }

  const contarTipo = (tipo) => {
    return solicitudes.filter(
      (solicitud) => solicitud.tipoSolicitud === tipo
    ).length
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Solicitudes de Combustible
            </h1>

            <p className="text-slate-500 mt-2">
              Registro y administración de solicitudes de combustible
            </p>
          </div>

          <button
            type="button"
            onClick={() => { if(usuarioLoggeadoRol !== "Audiencia") { abrirNuevaSolicitud() } } } 
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-medium transition"
          >
            <Plus size={20} />
            Nueva solicitud
          </button>
        </div>

        {errorApi && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle
              size={22}
              className="shrink-0 mt-0.5"
            />

            <div>
              <p className="text-sm font-semibold">
                No se pudo completar la operación
              </p>

              <p className="text-sm mt-1">
                {errorApi}
              </p>
            </div>
          </div>
        )}

        {mensajeExito && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle2
              size={22}
              className="shrink-0"
            />

            <p className="text-sm font-medium">
              {mensajeExito}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Manuales
            </p>

            <p className="text-2xl font-bold text-slate-800 mt-1">
              {cargando ? '-' : contarTipo('Manual')}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Programadas
            </p>

            <p className="text-2xl font-bold text-slate-800 mt-1">
              {cargando
                ? '-'
                : contarTipo('Programada') +
                  contarTipo('Automática')}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Recurrentes
            </p>

            <p className="text-2xl font-bold text-slate-800 mt-1">
              {cargando ? '-' : contarTipo('Recurrente')}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-slate-200">
            <div className="relative max-w-md">
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
                placeholder="Buscar solicitud..."
                className="w-full border border-slate-300 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Solicitud
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Tipo
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Empleado
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Vehículo
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Departamento
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Combustible
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Cantidad
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Estado
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Vencimiento
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="text-center py-12"
                    >
                      <Loader2
                        size={32}
                        className="animate-spin text-blue-600 mx-auto mb-3"
                      />

                      <p className="text-slate-500">
                        Cargando solicitudes...
                      </p>
                    </td>
                  </tr>
                ) : solicitudesFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="text-center py-12 text-slate-500"
                    >
                      No se encontraron solicitudes.
                    </td>
                  </tr>
                ) : (
                  solicitudesFiltradas.map(
                    (solicitud, indice) => (
                      <tr
                        key={
                          solicitud.id ||
                          `${solicitud.numero}-${indice}`
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                              <Fuel size={18} />
                            </div>

                            <div>
                              <p className="font-medium text-slate-800 whitespace-nowrap">
                                {solicitud.numero}
                              </p>

                              <p className="text-xs text-slate-500 whitespace-nowrap">
                                {formatearFecha(
                                  solicitud.fechaSolicitud
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${obtenerEstiloTipo(
                              solicitud.tipoSolicitud
                            )}`}
                          >
                            {obtenerIconoTipo(
                              solicitud.tipoSolicitud
                            )}

                            {solicitud.tipoSolicitud}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {solicitud.empleado}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {solicitud.vehiculo}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {solicitud.departamento}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {solicitud.tipoCombustible}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {solicitud.cantidad !== null &&
                          solicitud.cantidad !== undefined
                            ? `${solicitud.cantidad} gal`
                            : '—'}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 whitespace-nowrap">
                            {solicitud.estado}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                            <CalendarDays size={16} />

                            {formatearFecha(
                              solicitud.fechaVencimiento
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )
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
                  Nueva solicitud
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Complete los datos de la solicitud de combustible
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={procesando}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-50"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={guardarSolicitud}
              className="p-6"
            >
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de solicitud
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      manejarCambio({
                        target: {
                          name: 'tipoSolicitud',
                          value: 'Manual',
                        },
                      })
                    }
                    className={`p-4 border rounded-xl text-left transition ${
                      formulario.tipoSolicitud ===
                      'Manual'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Fuel
                      size={20}
                      className={
                        formulario.tipoSolicitud ===
                        'Manual'
                          ? 'text-blue-600'
                          : 'text-slate-500'
                      }
                    />

                    <p className="font-semibold text-slate-800 mt-2">
                      Manual
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Solicitud individual de combustible.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      manejarCambio({
                        target: {
                          name: 'tipoSolicitud',
                          value: 'Automática',
                        },
                      })
                    }
                    className={`p-4 border rounded-xl text-left transition ${
                      formulario.tipoSolicitud ===
                      'Automática'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Clock
                      size={20}
                      className={
                        formulario.tipoSolicitud ===
                        'Automática'
                          ? 'text-amber-600'
                          : 'text-slate-500'
                      }
                    />

                    <p className="font-semibold text-slate-800 mt-2">
                      Automática
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Solicitud automática según el proceso definido.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      manejarCambio({
                        target: {
                          name: 'tipoSolicitud',
                          value: 'Recurrente',
                        },
                      })
                    }
                    className={`p-4 border rounded-xl text-left transition ${
                      formulario.tipoSolicitud ===
                      'Recurrente'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Repeat
                      size={20}
                      className={
                        formulario.tipoSolicitud ===
                        'Recurrente'
                          ? 'text-purple-600'
                          : 'text-slate-500'
                      }
                    />

                    <p className="font-semibold text-slate-800 mt-2">
                      Recurrente
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Solicitud configurada para repetirse.
                    </p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Empleado
                  </label>

                  <select
                    name="empleadoId"
                    value={formulario.empleadoId}
                    onChange={manejarCambio}
                    required
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="">
                      Seleccione un empleado
                    </option>

                    {empleados.map((empleado) => (
                      <option
                        key={empleado.id}
                        value={empleado.id}
                      >
                        {obtenerCodigoEmpleado(
                          empleado
                        )}
                        {obtenerCodigoEmpleado(
                          empleado
                        )
                          ? ' - '
                          : ''}
                        {obtenerNombreEmpleado(
                          empleado
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Vehículo
                  </label>

                  <select
                    name="vehiculoId"
                    value={formulario.vehiculoId}
                    onChange={manejarCambio}
                    required
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="">
                      Seleccione un vehículo
                    </option>

                    {vehiculos.map((vehiculo) => (
                      <option
                        key={vehiculo.id}
                        value={vehiculo.id}
                      >
                        {obtenerNombreVehiculo(
                          vehiculo
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Departamento
                  </label>

                  <select
                    name="departamentoId"
                    value={
                      formulario.departamentoId
                    }
                    onChange={manejarCambio}
                    required
                    disabled={true}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="">
                      Seleccione un departamento
                    </option>

                    {departamentos.map(
                      (departamento) => (
                        <option
                          key={departamento.id}
                          value={departamento.id}
                        >
                          {obtenerNombreDepartamento(
                            departamento
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cantidad autorizada
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      name="cantidad"
                      value={formulario.cantidad}
                      onChange={manejarCambio}
                      required
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      galones
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de combustible
                  </label>

                  <select
                    name="tipoCombustible"
                    value={
                      formulario.tipoCombustible
                    }
                    onChange={manejarCambio}
                    required
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="Gasolina">
                      Gasolina
                    </option>
                    <option value="Gasoil">
                      Gasoil
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha de solicitud
                  </label>

                  <input
                    type="date"
                    name="fechaSolicitud"
                    value={
                      formulario.fechaSolicitud
                    }
                    onChange={manejarCambio}
                    required
                    disabled={true}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha de vencimiento
                  </label>

                  <input
                    type="date"
                    name="fechaVencimiento"
                    value={
                      formulario.fechaVencimiento
                    }
                    onChange={manejarCambio}
                    required
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {formulario.tipoSolicitud ===
                'Recurrente' && (
                <div className="mt-6 border border-purple-200 bg-purple-50/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Repeat
                      size={20}
                      className="text-purple-600"
                    />

                    <div>
                      <h3 className="font-semibold text-slate-800">
                        Configuración de recurrencia
                      </h3>

                      <p className="text-xs text-slate-500">
                        Configure la frecuencia y el período de la solicitud.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Frecuencia
                      </label>

                      <select
                        name="frecuencia"
                        value={
                          formulario.frecuencia
                        }
                        onChange={manejarCambio}
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">
                          Seleccione una frecuencia
                        </option>

                        <option value="Semanal">
                          Semanal
                        </option>

                        <option value="Quincenal">
                          Quincenal
                        </option>

                        <option value="Mensual">
                          Mensual
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Día de ejecución
                      </label>

                      <select
                        name="diaSemana"
                        value={
                          formulario.diaSemana
                        }
                        onChange={manejarCambio}
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">
                          Seleccione un día
                        </option>

                        <option value="1">
                          Lunes
                        </option>

                        <option value="2">
                          Martes
                        </option>

                        <option value="3">
                          Miércoles
                        </option>

                        <option value="4">
                          Jueves
                        </option>

                        <option value="5">
                          Viernes
                        </option>

                        <option value="6">
                          Sábado
                        </option>

                        <option value="0">
                          Domingo
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Fecha de inicio
                      </label>

                      <input
                        type="date"
                        name="fechaInicio"
                        value={
                          formulario.fechaInicio
                        }
                        onChange={manejarCambio}
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Fecha de fin
                      </label>

                      <input
                        type="date"
                        name="fechaFin"
                        value={formulario.fechaFin}
                        onChange={manejarCambio}
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={cerrarFormulario}
                  disabled={procesando}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={procesando}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70"
                >
                  {procesando && (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  )}

                  Registrar solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Solicitudes
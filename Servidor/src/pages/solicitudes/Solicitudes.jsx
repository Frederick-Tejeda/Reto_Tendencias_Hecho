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

function Solicitudes() {
  // Obtenemos el usuario de forma segura y normalizamos el rol a minúsculas
  const usuarioActual = JSON.parse(localStorage.getItem('fuelcontrol_usuario') || '{}')
  const rolRaw = String(usuarioActual.rol || usuarioActual.Rol || '').toLowerCase()

  // Determinamos permisos estrictos
  const esSolicitante = rolRaw === 'solicitante'
  
  // Solicitantes no deben ver la lista global de solicitudes ni los catálogos globales
  const puedeVerSolicitudesGlobales = !esSolicitante 
  const puedeVerCatalogos = !esSolicitante

  const crearFormularioVacio = () => ({
    tipoSolicitud: 'Manual',
    empleadoId: puedeVerCatalogos ? '' : (usuarioActual.id_empleado || usuarioActual.id || ''),
    vehiculoId: '',
    departamentoId: puedeVerCatalogos ? '' : (usuarioActual.id_departamento || ''),
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

  const obtenerHeaders = () => {
    return {
      Authorization: `Bearer ${localStorage.getItem('fuelcontrol_token')}`,
      'Content-Type': 'application/json',
    }
  }

  // Función envoltorio para ignorar errores 403 (Permisos) silenciosamente y no romper la UI
  const fetchSeguro = async (endpoint, debeEjecutar) => {
    if (!debeEjecutar) return { data: [] }; // Si no tiene permiso, devuelve lista vacía sin hacer petición

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers: obtenerHeaders() })
      if (response.status === 403) {
        // Si el backend lo prohíbe, lo ignoramos y devolvemos vacío para que la UI siga funcionando
        return { data: [] }
      }
      if (!response.ok) return { data: [] }
      return await response.json()
    } catch {
      return { data: [] }
    }
  }

  const normalizarLista = (resultado) => {
    if (Array.isArray(resultado)) return resultado
    if (Array.isArray(resultado?.data)) return resultado.data
    if (Array.isArray(resultado?.data?.items)) return resultado.data.items
    return []
  }

  const cargarDatos = async () => {
    setCargando(true)
    setErrorApi('')

    try {
      // Descargamos datos en paralelo y de forma segura
      const [
        datosSolicitudes,
        datosEmpleados,
        datosVehiculos,
        datosDepartamentos,
      ] = await Promise.all([
        fetchSeguro('/requests', puedeVerSolicitudesGlobales),
        fetchSeguro('/employees', puedeVerCatalogos),
        fetchSeguro('/vehicles', puedeVerCatalogos),
        fetchSeguro('/departments', puedeVerCatalogos),
      ])

      /* SOLICITUDES */
      const listaSolicitudes = normalizarLista(datosSolicitudes)
      const solicitudesMapeadas = listaSolicitudes.map((solicitud) => ({
        id: solicitud.requestId ?? solicitud.id_solicitud ?? solicitud.id ?? '',
        numero: solicitud.sequentialId ?? solicitud.requestCode ?? solicitud.codigo ?? (solicitud.requestId ? `SOL-${String(solicitud.requestId).padStart(4, '0')}` : 'Solicitud'),
        tipoSolicitud: solicitud.requestType ?? solicitud.tipoSolicitud ?? 'Manual',
        empleadoId: solicitud.employeeId ?? solicitud.id_empleado ?? '',
        empleado: solicitud.employeeName ?? solicitud.empleado ?? 'No especificado',
        vehiculoId: solicitud.vehicleId ?? solicitud.id_vehiculo ?? '',
        vehiculo: solicitud.vehicleCode ?? solicitud.ficha_interna ?? 'No especificado',
        departamentoId: solicitud.departmentId ?? solicitud.id_departamento ?? '',
        departamento: solicitud.departmentName ?? solicitud.departamento ?? 'No especificado',
        cantidad: solicitud.authorizedQuantityGal ?? solicitud.cantidad_autorizada ?? null,
        tipoCombustible: solicitud.fuelType ?? solicitud.tipo_combustible ?? 'No especificado',
        fechaSolicitud: solicitud.requestDate ?? solicitud.fecha_solicitud ?? '',
        fechaVencimiento: solicitud.expirationDate ?? solicitud.fecha_vencimiento ?? '',
        estado: solicitud.status ?? solicitud.estado ?? 'Sin estado',
      }))
      setSolicitudes(solicitudesMapeadas)

      /* CATÁLOGOS */
      setEmpleados(normalizarLista(datosEmpleados))
      setVehiculos(normalizarLista(datosVehiculos))
      setDepartamentos(normalizarLista(datosDepartamentos))

    } catch (error) {
      console.error('Error cargando datos:', error)
      setErrorApi('Problema de conexión con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const formatearFecha = (fecha) => {
    if (!fecha) return '—'
    return String(fecha).includes('T') ? String(fecha).split('T')[0] : String(fecha)
  }

  const solicitudesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return solicitudes

    return solicitudes.filter((solicitud) => {
      return [
        solicitud.numero,
        solicitud.tipoSolicitud,
        solicitud.empleado,
        solicitud.vehiculo,
        solicitud.departamento,
        solicitud.tipoCombustible,
        solicitud.estado,
      ].some((valor) => String(valor ?? '').toLowerCase().includes(texto))
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

    if (name === 'tipoSolicitud') {
      setFormulario((anterior) => ({ ...anterior, tipoSolicitud: value, frecuencia: '', diaSemana: '', fechaInicio: '', fechaFin: '' }))
      return
    }

    if (name === 'empleadoId' && empleados.length > 0) {
      const empleadoSeleccionado = empleados.find((emp) => String(emp.id) === String(value))
      const departamentoEmpleado = empleadoSeleccionado?.department?.id ?? empleadoSeleccionado?.departmentId ?? empleadoSeleccionado?.id_departamento ?? ''
      setFormulario((anterior) => ({
        ...anterior,
        empleadoId: value,
        departamentoId: departamentoEmpleado !== '' ? String(departamentoEmpleado) : anterior.departamentoId,
      }))
      return
    }

    setFormulario((anterior) => ({ ...anterior, [name]: value }))
  }

  const validarFormulario = () => {
    if (!formulario.empleadoId || !formulario.vehiculoId || !formulario.departamentoId || !formulario.cantidad || !formulario.fechaSolicitud || !formulario.fechaVencimiento) {
      return 'Complete todos los campos obligatorios.'
    }
    const cantidad = Number(formulario.cantidad)
    if (!Number.isFinite(cantidad) || cantidad <= 0) return 'La cantidad autorizada debe ser mayor que cero.'
    if (formulario.fechaVencimiento < formulario.fechaSolicitud) return 'La fecha de vencimiento es incorrecta.'
    return ''
  }

  const convertirFechaUtc = (fecha, finDelDia = false) => {
    if (!fecha) return null
    return finDelDia ? `${fecha}T23:59:59Z` : `${fecha}T00:00:00Z`
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

    // Payload según el contrato DTO de la API (3.1 Solicitudes - Crear)
    const payload = {
      employeeId: Number(formulario.empleadoId),
      vehicleId: Number(formulario.vehiculoId),
      departmentId: Number(formulario.departamentoId),
      authorizedQuantityGal: Number(formulario.cantidad),
      fuelType: formulario.tipoCombustible,
      requestType: formulario.tipoSolicitud,
      requestDate: convertirFechaUtc(formulario.fechaSolicitud),
      expirationDate: convertirFechaUtc(formulario.fechaVencimiento, true),
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

      const resultado = await response.json().catch(() => null)

      if (!response.ok || (resultado && resultado.success === false)) {
        setErrorApi(resultado?.message || `El servidor rechazó la solicitud. HTTP ${response.status}.`)
        return
      }

      setMostrarFormulario(false)
      setFormulario(crearFormularioVacio())
      setMensajeExito(resultado?.message || 'Solicitud registrada correctamente.')

      if (puedeVerSolicitudesGlobales) {
        await cargarDatos()
      }
    } catch (error) {
      setErrorApi('No fue posible conectar con el servidor para registrar la solicitud.')
    } finally {
      setProcesando(false)
    }
  }

  const contarTipo = (tipo) => solicitudes.filter((s) => s.tipoSolicitud === tipo).length

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Solicitudes de Combustible</h1>
            <p className="text-slate-500 mt-2">Registro y administración de solicitudes</p>
          </div>
          <button onClick={abrirNuevaSolicitud} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-medium transition">
            <Plus size={20} /> Nueva solicitud
          </button>
        </div>

        {errorApi && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle size={22} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">No se pudo completar la operación</p>
              <p className="text-sm mt-1">{errorApi}</p>
            </div>
          </div>
        )}

        {mensajeExito && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle2 size={22} className="shrink-0" />
            <p className="text-sm font-medium">{mensajeExito}</p>
          </div>
        )}

        {puedeVerSolicitudesGlobales ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-sm text-slate-500">Manuales</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{cargando ? '-' : contarTipo('Manual')}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-sm text-slate-500">Programadas / Automáticas</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{cargando ? '-' : contarTipo('Programada') + contarTipo('Automática')}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-sm text-slate-500">Recurrentes</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{cargando ? '-' : contarTipo('Recurrente')}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <div className="relative max-w-md">
                  <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar solicitud..." className="w-full border border-slate-300 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">ID</th>
                      <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">Empleado</th>
                      <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">Vehículo</th>
                      <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">Cant.</th>
                      <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {cargando ? (
                      <tr><td colSpan="5" className="text-center py-12"><Loader2 className="animate-spin text-blue-600 mx-auto mb-3" /></td></tr>
                    ) : solicitudesFiltradas.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-12 text-slate-500">No se encontraron solicitudes.</td></tr>
                    ) : (
                      solicitudesFiltradas.map((solicitud, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-medium text-slate-800">{solicitud.numero}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{solicitud.empleado}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{solicitud.vehiculo}</td>
                          <td className="px-5 py-4 text-sm font-bold text-blue-600">{solicitud.cantidad ? `${solicitud.cantidad} gal` : '—'}</td>
                          <td className="px-5 py-4"><span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{solicitud.estado}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
             <Fuel size={48} className="mx-auto text-blue-300 mb-4" />
             <h3 className="text-xl font-bold text-slate-800">Panel del Solicitante</h3>
             <p className="text-slate-500 mt-2 max-w-md mx-auto">
               Utiliza el botón superior derecho para enviar una nueva solicitud de combustible. Tu número de empleado se autocompletará en el formulario.
             </p>
          </div>
        )}
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">Formulario de Solicitud</h2>
              <button onClick={cerrarFormulario} className="p-2 hover:bg-slate-100 rounded-lg"><X size={22} /></button>
            </div>

            <form onSubmit={guardarSolicitud} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Empleado (ID)</label>
                  {empleados.length > 0 ? (
                    <select name="empleadoId" value={formulario.empleadoId} onChange={manejarCambio} required className="w-full border rounded-lg p-3">
                      <option value="">Seleccione un empleado...</option>
                      {empleados.map(e => <option key={e.id} value={e.id}>{e.employeeCode || e.id} - {e.fullName || e.name}</option>)}
                    </select>
                  ) : (
                    <input type="number" name="empleadoId" value={formulario.empleadoId} onChange={manejarCambio} required placeholder="ID Numérico" className="w-full border rounded-lg p-3" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vehículo (ID)</label>
                  {vehiculos.length > 0 ? (
                    <select name="vehiculoId" value={formulario.vehiculoId} onChange={manejarCambio} required className="w-full border rounded-lg p-3">
                      <option value="">Seleccione un vehículo...</option>
                      {vehiculos.map(v => <option key={v.id} value={v.id}>{v.internalCode || v.licensePlate}</option>)}
                    </select>
                  ) : (
                    <input type="number" name="vehiculoId" value={formulario.vehiculoId} onChange={manejarCambio} required placeholder="ID Numérico del vehículo" className="w-full border rounded-lg p-3" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Departamento (ID)</label>
                  {departamentos.length > 0 ? (
                    <select name="departamentoId" value={formulario.departamentoId} onChange={manejarCambio} required className="w-full border rounded-lg p-3">
                      <option value="">Seleccione un departamento...</option>
                      {departamentos.map(d => <option key={d.id} value={d.id}>{d.name || d.description}</option>)}
                    </select>
                  ) : (
                    <input type="number" name="departamentoId" value={formulario.departamentoId} onChange={manejarCambio} required placeholder="ID del departamento" className="w-full border rounded-lg p-3" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cantidad (Galones)</label>
                  <input type="number" min="0.01" step="0.01" name="cantidad" value={formulario.cantidad} onChange={manejarCambio} required className="w-full border rounded-lg p-3" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-5 border-t">
                <button type="button" onClick={cerrarFormulario} className="px-5 py-2.5 border rounded-lg">Cancelar</button>
                <button type="submit" disabled={procesando} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium">
                  {procesando ? 'Procesando...' : 'Enviar Solicitud'}
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
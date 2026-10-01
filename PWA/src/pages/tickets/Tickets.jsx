import { useEffect, useMemo, useState } from 'react'
import {
  Ticket,
  RefreshCw,
  Search,
  CalendarDays,
  Fuel,
  UserRound,
  Car,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  PlusCircle,
} from 'lucide-react'

import { API_BASE_URL } from '../../App.jsx'

const usuarioLoggeadoRol = JSON.parse(localStorage.getItem("fuelcontrol_usuario"))?.rol;

function Tickets() {
  const [tickets, setTickets] = useState([])
  const [solicitudesPendientes, setSolicitudesPendientes] =
    useState([])

  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  const [modalEmision, setModalEmision] = useState(false)
  const [solicitudSeleccionada, setSolicitudSeleccionada] =
    useState(null)

  const [modalCancelacion, setModalCancelacion] =
    useState(false)
  const [ticketCancelar, setTicketCancelar] = useState(null)
  const [motivoCancelacion, setMotivoCancelacion] =
    useState('')

  const obtenerToken = () =>
    localStorage.getItem('fuelcontrol_token')

  const obtenerUsuario = () => {
    try {
      return JSON.parse(
        localStorage.getItem('fuelcontrol_usuario') || '{}',
      )
    } catch {
      return {}
    }
  }

  const obtenerMensajeError = (resultado, fallback) =>
    resultado?.message ||
    resultado?.Message ||
    resultado?.error ||
    fallback

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A'

    const valor = new Date(fecha)

    if (Number.isNaN(valor.getTime())) {
      return fecha
    }

    return valor.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const cargarDatos = async () => {
    const token = obtenerToken()

    if (!token) {
      setError(
        'No se encontró una sesión válida. Inicia sesión nuevamente.',
      )
      setCargando(false)
      return
    }

    setCargando(true)
    setError('')

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      }

      const [respuestaTickets, respuestaPendientes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/tickets`, {
            headers,
          }),
          fetch(`${API_BASE_URL}/requests/pendientes`, {
            headers,
          }),
        ])

      const resultadoTickets = await respuestaTickets
        .json()
        .catch(() => null)

      const resultadoPendientes = await respuestaPendientes
        .json()
        .catch(() => null)

      if (
        !respuestaTickets.ok ||
        !resultadoTickets?.success
      ) {
        throw new Error(
          obtenerMensajeError(
            resultadoTickets,
            'No fue posible cargar los tickets.',
          ),
        )
      }

      if (!respuestaPendientes.ok) {
        throw new Error(
          obtenerMensajeError(
            resultadoPendientes,
            'No fue posible cargar las solicitudes pendientes.',
          ),
        )
      }

      const listaTickets = Array.isArray(
        resultadoTickets?.data,
      )
        ? resultadoTickets.data
        : []

      /*
        El endpoint /requests/pendientes ha sido validado
        contra la API real y actualmente devuelve un arreglo
        directamente.
      */
      const listaPendientes = Array.isArray(
        resultadoPendientes,
      )
        ? resultadoPendientes
        : Array.isArray(resultadoPendientes?.data)
          ? resultadoPendientes.data
          : []

      setTickets(listaTickets)
      setSolicitudesPendientes(listaPendientes)
    } catch (err) {
      console.error('Error cargando tickets:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error cargando la información.',
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const estadosDisponibles = useMemo(() => {
    const estados = tickets
      .map((item) => item.status)
      .filter(Boolean)

    return ['Todos', ...new Set(estados)]
  }, [tickets])

  const ticketsFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return tickets.filter((item) => {
      const coincideEstado =
        filtroEstado === 'Todos' ||
        item.status === filtroEstado

      const coincideBusqueda =
        !texto ||
        String(item.sequentialId || '')
          .toLowerCase()
          .includes(texto) ||
        String(item.uuid || '')
          .toLowerCase()
          .includes(texto) ||
        String(item.status || '')
          .toLowerCase()
          .includes(texto)

      return coincideEstado && coincideBusqueda
    })
  }, [tickets, busqueda, filtroEstado])

  const abrirEmision = (solicitud) => {
    setSolicitudSeleccionada(solicitud)
    setError('')
    setMensaje('')
    setModalEmision(true)
  }

  const cerrarEmision = () => {
    if (procesando) return

    setModalEmision(false)
    setSolicitudSeleccionada(null)
  }

  const emitirTicket = async () => {
    if (!solicitudSeleccionada) return

    const token = obtenerToken()
    const usuario = obtenerUsuario()

    if (!token) {
      setError('No se encontró el token de autenticación.')
      return
    }

    if (!usuario?.id) {
      setError(
        'No fue posible identificar al usuario Supervisor.',
      )
      return
    }

    setProcesando(true)
    setError('')
    setMensaje('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/tickets/issue`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId:
              solicitudSeleccionada.id_solicitud,
            approvedBy: usuario.id,
          }),
        },
      )

      const resultado = await response
        .json()
        .catch(() => null)

      if (!response.ok || !resultado?.success) {
        throw new Error(
          obtenerMensajeError(
            resultado,
            'No fue posible emitir el ticket.',
          ),
        )
      }

      const secuencia =
        resultado?.data?.sequentialId || 'nuevo ticket'

      setMensaje(
        `Ticket ${secuencia} emitido correctamente.`,
      )

      setModalEmision(false)
      setSolicitudSeleccionada(null)

      await cargarDatos()
    } catch (err) {
      console.error('Error emitiendo ticket:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al emitir el ticket.',
      )
    } finally {
      setProcesando(false)
    }
  }

  const abrirCancelacion = (ticketActual) => {
    setTicketCancelar(ticketActual)
    setMotivoCancelacion('')
    setError('')
    setMensaje('')
    setModalCancelacion(true)
  }

  const cerrarCancelacion = () => {
    if (procesando) return

    setModalCancelacion(false)
    setTicketCancelar(null)
    setMotivoCancelacion('')
  }

  const cancelarTicket = async (event) => {
    event.preventDefault()

    const token = obtenerToken()
    const motivo = motivoCancelacion.trim()

    if (!token) {
      setError('No se encontró el token de autenticación.')
      return
    }

    if (!ticketCancelar?.uuid) {
      setError('No se pudo identificar el ticket.')
      return
    }

    if (!motivo) {
      setError(
        'Debes indicar el motivo de la anulación.',
      )
      return
    }

    setProcesando(true)
    setError('')
    setMensaje('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/tickets/${encodeURIComponent(
          ticketCancelar.uuid,
        )}/cancel`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: motivo,
          }),
        },
      )

      const resultado = await response
        .json()
        .catch(() => null)

      if (!response.ok || resultado?.success === false) {
        throw new Error(
          obtenerMensajeError(
            resultado,
            'No fue posible anular el ticket.',
          ),
        )
      }

      setMensaje(
        `Ticket ${
          ticketCancelar.sequentialId || ''
        } anulado correctamente.`,
      )

      setModalCancelacion(false)
      setTicketCancelar(null)
      setMotivoCancelacion('')

      await cargarDatos()
    } catch (err) {
      console.error('Error anulando ticket:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al anular el ticket.',
      )
    } finally {
      setProcesando(false)
    }
  }

  const claseEstado = (estado) => {
    const valor = String(estado || '').toLowerCase()

    if (
      valor.includes('anulado') ||
      valor.includes('cancel')
    ) {
      return 'bg-red-100 text-red-700 border-red-200'
    }

    if (
      valor.includes('consumido') ||
      valor.includes('utilizado')
    ) {
      return 'bg-slate-100 text-slate-700 border-slate-200'
    }

    if (
      valor.includes('pendiente') ||
      valor.includes('generado')
    ) {
      return 'bg-amber-100 text-amber-700 border-amber-200'
    }

    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const puedeAnular = (estado) => {
    const valor = String(estado || '').toLowerCase()

    return (
      !valor.includes('anulado') &&
      !valor.includes('cancel') &&
      !valor.includes('consumido') &&
      !valor.includes('utilizado')
    )
  }

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2
          size={42}
          className="animate-spin text-blue-600"
        />

        <p className="mt-4 text-slate-600 font-medium">
          Cargando gestión de tickets...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-7">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Ticket size={25} />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                Tickets
              </h1>

              <p className="text-slate-500 mt-1">
                Emisión, consulta y anulación de tickets
                digitales de combustible.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={cargarDatos}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={19} />
          Actualizar
        </button>
      </div>

      {mensaje && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 flex items-start gap-3">
          <CheckCircle2
            size={20}
            className="shrink-0 mt-0.5"
          />

          <span>{mensaje}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle
            size={20}
            className="shrink-0 mt-0.5"
          />

          <span>{error}</span>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Solicitudes pendientes
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Solicitudes disponibles para aprobación y
                emisión de ticket.
              </p>
            </div>

            <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-bold">
              {solicitudesPendientes.length}
            </span>
          </div>
        </div>

        {solicitudesPendientes.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2
              size={38}
              className="mx-auto text-green-500"
            />

            <p className="font-semibold text-slate-700 mt-3">
              No hay solicitudes pendientes
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">Solicitud</th>
                  <th className="px-5 py-4">Empleado</th>
                  <th className="px-5 py-4">Vehículo</th>
                  <th className="px-5 py-4">
                    Departamento
                  </th>
                  <th className="px-5 py-4">
                    Combustible
                  </th>
                  <th className="px-5 py-4">Cantidad</th>
                  <th className="px-5 py-4">
                    Vencimiento
                  </th>
                  <th className="px-5 py-4 text-right">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {solicitudesPendientes.map((solicitud) => (
                  <tr
                    key={solicitud.id_solicitud}
                    className="hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 font-bold text-slate-800">
                      #{solicitud.id_solicitud}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <UserRound
                          size={17}
                          className="text-slate-400"
                        />
                        {solicitud.empleado || 'N/A'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Car
                          size={17}
                          className="text-slate-400"
                        />

                        <span>
                          {solicitud.ficha_interna || 'N/A'}
                          {solicitud.placa
                            ? ` · ${solicitud.placa}`
                            : ''}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Building2
                          size={17}
                          className="text-slate-400"
                        />
                        {solicitud.departamento || 'N/A'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Fuel
                          size={17}
                          className="text-slate-400"
                        />
                        {solicitud.tipo_combustible ||
                          'N/A'}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {solicitud.cantidad_autorizada ??
                        'N/A'}{' '}
                      gal
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays
                          size={17}
                          className="text-slate-400"
                        />
                        {formatearFecha(
                          solicitud.fecha_vencimiento,
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => { if(usuarioLoggeadoRol !== "Audiencia") { abrirEmision(solicitud) } } }
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                      >
                        <PlusCircle size={17} />
                        Emitir ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Tickets emitidos
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Información obtenida directamente del
                backend.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={busqueda}
                  onChange={(event) =>
                    setBusqueda(event.target.value)
                  }
                  placeholder="Buscar ticket..."
                  className="w-full sm:w-60 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filtroEstado}
                onChange={(event) =>
                  setFiltroEstado(event.target.value)
                }
                className="border border-slate-300 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {estadosDisponibles.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {ticketsFiltrados.length === 0 ? (
          <div className="p-10 text-center">
            <Ticket
              size={38}
              className="mx-auto text-slate-300"
            />

            <p className="font-semibold text-slate-700 mt-3">
              No se encontraron tickets
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">Ticket</th>
                  <th className="px-5 py-4">UUID</th>
                  <th className="px-5 py-4">
                    Vencimiento
                  </th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4 text-right">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {ticketsFiltrados.map((item) => (
                  <tr
                    key={item.uuid}
                    className="hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 font-bold text-slate-800">
                      {item.sequentialId || 'N/A'}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className="font-mono text-xs text-slate-500"
                        title={item.uuid}
                      >
                        {item.uuid || 'N/A'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {formatearFecha(
                        item.expirationDate,
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full border text-xs font-bold ${claseEstado(
                          item.status,
                        )}`}
                      >
                        {item.status || 'Sin estado'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      {puedeAnular(item.status) ? (
                        <button
                          type="button"
                          onClick={() => { if(usuarioLoggeadoRol !== "Audiencia") { abrirCancelacion(item) } } }
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-semibold transition-colors"
                        >
                          <XCircle size={17} />
                          Anular
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">
                          Sin acciones
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalEmision && solicitudSeleccionada && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                Emitir ticket
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Confirma la aprobación de la solicitud.
              </p>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <p>
                <strong>Solicitud:</strong> #
                {solicitudSeleccionada.id_solicitud}
              </p>

              <p>
                <strong>Empleado:</strong>{' '}
                {solicitudSeleccionada.empleado || 'N/A'}
              </p>

              <p>
                <strong>Vehículo:</strong>{' '}
                {solicitudSeleccionada.ficha_interna ||
                  'N/A'}{' '}
                {solicitudSeleccionada.placa
                  ? `· ${solicitudSeleccionada.placa}`
                  : ''}
              </p>

              <p>
                <strong>Combustible:</strong>{' '}
                {solicitudSeleccionada.tipo_combustible ||
                  'N/A'}
              </p>

              <p>
                <strong>Cantidad autorizada:</strong>{' '}
                {solicitudSeleccionada.cantidad_autorizada ??
                  'N/A'}{' '}
                gal
              </p>

              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mt-4">
                Esta acción emitirá un ticket real para esta
                solicitud.
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={cerrarEmision}
                disabled={procesando}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={emitirTicket}
                disabled={procesando}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                {procesando ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Emitiendo...
                  </>
                ) : (
                  <>
                    <Ticket size={18} />
                    Confirmar emisión
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCancelacion && ticketCancelar && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <form onSubmit={cancelarTicket}>
              <div className="p-5 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">
                  Anular ticket
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {ticketCancelar.sequentialId}
                </p>
              </div>

              <div className="p-5">
                <label
                  htmlFor="motivo-cancelacion"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Motivo de la anulación
                </label>

                <textarea
                  id="motivo-cancelacion"
                  value={motivoCancelacion}
                  onChange={(event) => {
                    setMotivoCancelacion(
                      event.target.value,
                    )
                    setError('')
                  }}
                  rows={4}
                  required
                  placeholder="Indica el motivo..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    {error}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarCancelacion}
                  disabled={procesando}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Volver
                </button>

                <button
                  type="submit"
                  disabled={
                    procesando ||
                    !motivoCancelacion.trim()
                  }
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {procesando ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Anulando...
                    </>
                  ) : (
                    <>
                      <XCircle size={18} />
                      Confirmar anulación
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tickets
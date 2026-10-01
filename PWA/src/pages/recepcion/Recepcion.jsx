import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  Search,
  Plus,
  Truck,
  Fuel,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'

import AdminLayout from '../../components/layouts/AdminLayout'
import { API_BASE_URL } from '../../App.jsx'

const usuarioLoggeadoRol = JSON.parse(localStorage.getItem("fuelcontrol_usuario"))?.rol;

const formularioInicial = {
  stationId: '',
  supplierId: '',
  tankId: '',
  invoiceNumber: '',
  documentedVolumeGallons: '',
  receivedVolumeGallons: '',
  receivedAt: '',
  notes: '',
}

function Recepcion() {
  const [movimientos, setMovimientos] = useState([])
  const [estaciones, setEstaciones] = useState([])
  const [suplidores, setSuplidores] = useState([])
  const [inventario, setInventario] = useState([])

  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [formulario, setFormulario] = useState(formularioInicial)

  const [cargando, setCargando] = useState(true)
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [errorApi, setErrorApi] = useState('')
  const [errorFormulario, setErrorFormulario] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  const obtenerToken = () => {
    return localStorage.getItem('fuelcontrol_token')
  }

  const obtenerUsuarioActual = () => {
    try {
      return JSON.parse(
        localStorage.getItem('fuelcontrol_usuario') || '{}'
      )
    } catch {
      return {}
    }
  }

  const leerRespuesta = async (response) => {
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      return response.json()
    }

    const texto = await response.text()

    return {
      success: response.ok,
      message: texto,
    }
  }

  const obtenerArray = (resultado) => {
    if (Array.isArray(resultado)) {
      return resultado
    }

    if (Array.isArray(resultado?.data)) {
      return resultado.data
    }

    if (Array.isArray(resultado?.items)) {
      return resultado.items
    }

    if (Array.isArray(resultado?.data?.items)) {
      return resultado.data.items
    }

    return []
  }

  const peticionGet = useCallback(async (ruta) => {
    const token = obtenerToken()

    if (!token) {
      throw new Error(
        'No se encontró una sesión válida. Inicia sesión nuevamente.'
      )
    }

    const response = await fetch(`${API_BASE_URL}${ruta}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    const resultado = await leerRespuesta(response)

    if (!response.ok) {
      throw new Error(
        resultado?.error ||
          resultado?.message ||
          resultado?.mensaje ||
          `Error HTTP ${response.status}.`
      )
    }

    if (resultado?.success === false) {
      throw new Error(
        resultado?.error ||
          resultado?.message ||
          resultado?.mensaje ||
          'La API no pudo completar la solicitud.'
      )
    }

    return resultado
  }, [])

  /*
   * Estructura REAL confirmada de GET /inventory/movements:
   *
   * {
   *   reference: "PRUEBA-FRONT-001",
   *   timestamp: "2026-09-29T16:00:00.000Z",
   *   transactionId: 3,
   *   type: "Entrada",
   *   volume: 10
   * }
   */
  const normalizarMovimiento = (movimiento, index) => {
    const fechaRaw = movimiento.timestamp ?? null

    let fecha = 'N/A'
    let hora = 'N/A'

    if (fechaRaw) {
      const fechaObjeto = new Date(fechaRaw)

      if (!Number.isNaN(fechaObjeto.getTime())) {
        fecha = fechaObjeto.toLocaleDateString('es-DO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })

        hora = fechaObjeto.toLocaleTimeString('es-DO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      }
    }

    return {
      id:
        movimiento.transactionId ??
        `movimiento-${index}`,

      tipo: movimiento.type ?? 'Movimiento',

      referencia:
        movimiento.reference ?? 'Sin referencia',

      volumen:
        movimiento.volume !== undefined &&
        movimiento.volume !== null
          ? Number(movimiento.volume)
          : null,

      fecha,
      hora,
    }
  }

  const cargarMovimientos = useCallback(async () => {
    setCargando(true)
    setErrorApi('')

    try {
      const resultado = await peticionGet('/inventory/movements')
      const lista = obtenerArray(resultado)

      setMovimientos(
        lista.map((movimiento, index) =>
          normalizarMovimiento(movimiento, index)
        )
      )
    } catch (error) {
      console.error('Error cargando movimientos:', error)

      setMovimientos([])
      setErrorApi(
        error.message ||
          'No fue posible consultar los movimientos de inventario.'
      )
    } finally {
      setCargando(false)
    }
  }, [peticionGet])

  useEffect(() => {
    cargarMovimientos()
  }, [cargarMovimientos])

  const cargarCatalogos = async () => {
    setCargandoCatalogos(true)
    setErrorFormulario('')

    try {
      const [
        resultadoEstaciones,
        resultadoSuplidores,
        resultadoInventario,
      ] = await Promise.all([
        peticionGet('/stations?estado=true'),
        peticionGet('/suppliers?estado=true'),
        peticionGet('/inventory?estado=true'),
      ])

      const listaEstaciones = obtenerArray(resultadoEstaciones)
      const listaSuplidores = obtenerArray(resultadoSuplidores)
      const listaInventario = obtenerArray(resultadoInventario)

      setEstaciones(listaEstaciones)
      setSuplidores(listaSuplidores)
      setInventario(listaInventario)

      if (listaEstaciones.length === 0) {
        throw new Error(
          'No hay estaciones activas disponibles para registrar una recepción.'
        )
      }

      if (listaSuplidores.length === 0) {
        throw new Error(
          'No hay suplidores activos disponibles para registrar una recepción.'
        )
      }

      if (listaInventario.length === 0) {
        throw new Error(
          'No hay tanques activos registrados en inventario.'
        )
      }
    } catch (error) {
      console.error('Error cargando catálogos:', error)

      setErrorFormulario(
        error.message ||
          'No fue posible cargar los datos necesarios para la recepción.'
      )
    } finally {
      setCargandoCatalogos(false)
    }
  }

  const abrirNuevaRecepcion = async () => {
    setFormulario(formularioInicial)
    setErrorFormulario('')
    setMensajeExito('')
    setModalAbierto(true)

    await cargarCatalogos()
  }

  const cerrarModal = () => {
    if (guardando) {
      return
    }

    setModalAbierto(false)
    setFormulario(formularioInicial)
    setErrorFormulario('')
  }

  const manejarCambio = (event) => {
    const { name, value } = event.target

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }))

    setErrorFormulario('')
  }

  const manejarCambioEstacion = (event) => {
    const stationId = event.target.value

    setFormulario((actual) => ({
      ...actual,
      stationId,
      tankId: '',
    }))

    setErrorFormulario('')
  }

  const estacionSeleccionada = useMemo(() => {
    return estaciones.find(
      (estacion) =>
        String(estacion.id_estacion) ===
        String(formulario.stationId)
    )
  }, [estaciones, formulario.stationId])

  const suplidorSeleccionado = useMemo(() => {
    return suplidores.find(
      (suplidor) =>
        String(suplidor.id_suplidor) ===
        String(formulario.supplierId)
    )
  }, [suplidores, formulario.supplierId])

  const tanquesDisponibles = useMemo(() => {
    if (!formulario.stationId) {
      return []
    }

    return inventario.filter(
      (tanque) =>
        tanque.estado !== false &&
        String(tanque.id_estacion) ===
          String(formulario.stationId)
    )
  }, [inventario, formulario.stationId])

  const tanqueSeleccionado = useMemo(() => {
    return inventario.find(
      (tanque) =>
        String(tanque.id_tanque) ===
        String(formulario.tankId)
    )
  }, [inventario, formulario.tankId])

  const capacidadDisponible = useMemo(() => {
    if (!tanqueSeleccionado) {
      return null
    }

    const capacidad = Number(tanqueSeleccionado.capacidad_maxima)
    const existencia = Number(tanqueSeleccionado.existencia_actual)

    if (
      !Number.isFinite(capacidad) ||
      !Number.isFinite(existencia)
    ) {
      return null
    }

    return Math.max(capacidad - existencia, 0)
  }, [tanqueSeleccionado])

  const validarFormulario = () => {
    if (!formulario.stationId) {
      return 'Selecciona una estación.'
    }

    if (!formulario.supplierId) {
      return 'Selecciona un suplidor.'
    }

    if (!formulario.tankId) {
      return 'Selecciona un tanque.'
    }

    if (!formulario.invoiceNumber.trim()) {
      return 'Ingresa el número de factura.'
    }

    const volumenDocumentado = Number(
      formulario.documentedVolumeGallons
    )

    const volumenRecibido = Number(
      formulario.receivedVolumeGallons
    )

    if (
      !Number.isFinite(volumenDocumentado) ||
      volumenDocumentado <= 0
    ) {
      return 'El volumen documentado debe ser mayor que cero.'
    }

    if (
      !Number.isFinite(volumenRecibido) ||
      volumenRecibido <= 0
    ) {
      return 'El volumen recibido debe ser mayor que cero.'
    }

    if (!formulario.receivedAt) {
      return 'Selecciona la fecha de recepción.'
    }

    if (
      capacidadDisponible !== null &&
      volumenRecibido > capacidadDisponible
    ) {
      return `El volumen recibido supera la capacidad disponible del tanque (${capacidadDisponible.toLocaleString(
        'es-DO'
      )} galones).`
    }

    return ''
  }

  const registrarRecepcion = async (event) => {
    event.preventDefault()

    const errorValidacion = validarFormulario()

    if (errorValidacion) {
      setErrorFormulario(errorValidacion)
      return
    }

    const usuario = obtenerUsuarioActual()
    const receivedByUserId = Number(usuario.id)

    if (
      !Number.isInteger(receivedByUserId) ||
      receivedByUserId <= 0
    ) {
      setErrorFormulario(
        'No se pudo identificar el usuario que está registrando la recepción. Inicia sesión nuevamente.'
      )
      return
    }

    setGuardando(true)
    setErrorFormulario('')
    setMensajeExito('')

    try {
      const token = obtenerToken()

      if (!token) {
        throw new Error(
          'No se encontró una sesión válida. Inicia sesión nuevamente.'
        )
      }

      const fechaUtc = new Date(
        `${formulario.receivedAt}T12:00:00`
      ).toISOString()

      const payload = {
        supplierId: Number(formulario.supplierId),
        stationId: Number(formulario.stationId),
        tankId: Number(formulario.tankId),
        invoiceNumber: formulario.invoiceNumber.trim(),
        documentedVolumeGallons: Number(
          formulario.documentedVolumeGallons
        ),
        receivedVolumeGallons: Number(
          formulario.receivedVolumeGallons
        ),
        receivedAtUtc: fechaUtc,
        receivedByUserId,
        notes: formulario.notes.trim(),
      }

      const response = await fetch(
        `${API_BASE_URL}/inventory/receive`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const resultado = await leerRespuesta(response)

      if (!response.ok) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            resultado?.mensaje ||
            `No fue posible registrar la recepción. Código HTTP ${response.status}.`
        )
      }

      if (resultado?.success === false) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            resultado?.mensaje ||
            'El servidor no pudo registrar la recepción.'
        )
      }

      setModalAbierto(false)
      setFormulario(formularioInicial)

      setMensajeExito(
        'Recepción registrada correctamente. El inventario fue actualizado.'
      )

      await cargarMovimientos()
    } catch (error) {
      console.error('Error registrando recepción:', error)

      setErrorFormulario(
        error.message ||
          'No fue posible registrar la recepción.'
      )
    } finally {
      setGuardando(false)
    }
  }

  const movimientosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) {
      return movimientos
    }

    return movimientos.filter((movimiento) => {
      return [
        movimiento.id,
        movimiento.tipo,
        movimiento.referencia,
        movimiento.volumen,
        movimiento.fecha,
        movimiento.hora,
      ].some((valor) =>
        String(valor ?? '')
          .toLowerCase()
          .includes(texto)
      )
    })
  }, [movimientos, busqueda])

  const totalVolumen = useMemo(() => {
    return movimientos.reduce((total, movimiento) => {
      const volumen = Number(movimiento.volumen)

      return Number.isFinite(volumen)
        ? total + volumen
        : total
    }, 0)
  }, [movimientos])

  const referenciasIdentificadas = useMemo(() => {
    return new Set(
      movimientos
        .map((movimiento) => movimiento.referencia)
        .filter(
          (referencia) =>
            referencia &&
            referencia !== 'Sin referencia'
        )
    ).size
  }, [movimientos])

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Recepción de Combustible
            </h1>

            <p className="text-slate-500 mt-2">
              Registro de combustible recibido de suplidores
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={cargarMovimientos}
              disabled={cargando}
              className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                className={cargando ? 'animate-spin' : ''}
              />

              Actualizar
            </button>

            <button
              type="button"
              onClick={() => { if(usuarioLoggeadoRol !== "Audiencia") { abrirNuevaRecepcion() } } }
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Nueva recepción
            </button>
          </div>
        </div>

        {mensajeExito && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle2 size={22} />
            <span>{mensajeExito}</span>
          </div>
        )}

        {errorApi && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle
              size={22}
              className="shrink-0 mt-0.5"
            />

            <div>
              <p className="font-semibold">
                No se pudo consultar el historial
              </p>

              <p className="text-sm mt-1">
                {errorApi}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
                <Truck size={26} />
              </div>

              <div>
                <p className="text-slate-500 text-sm">
                  Movimientos encontrados
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {cargando ? '-' : movimientos.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 text-green-600 p-3 rounded-xl">
                <Fuel size={26} />
              </div>

              <div>
                <p className="text-slate-500 text-sm">
                  Volumen registrado
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {cargando
                    ? '-'
                    : totalVolumen.toLocaleString('es-DO')}
                </p>

                <p className="text-xs text-slate-400">
                  galones
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 text-amber-600 p-3 rounded-xl">
                <FileText size={26} />
              </div>

              <div>
                <p className="text-slate-500 text-sm">
                  Referencias identificadas
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {cargando
                    ? '-'
                    : referenciasIdentificadas}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-slate-200">
            <div className="relative max-w-xl">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                placeholder="Buscar movimiento..."
                className="w-full border border-slate-300 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    ID
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Tipo
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Referencia
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Volumen
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Fecha
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Hora
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-12"
                    >
                      <Loader2
                        size={32}
                        className="animate-spin text-blue-600 mx-auto mb-3"
                      />

                      <p className="text-slate-500">
                        Cargando movimientos...
                      </p>
                    </td>
                  </tr>
                ) : movimientosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-12"
                    >
                      <Truck
                        size={36}
                        className="text-slate-300 mx-auto mb-3"
                      />

                      <p className="font-medium text-slate-600">
                        No se encontraron movimientos.
                      </p>
                    </td>
                  </tr>
                ) : (
                  movimientosFiltrados.map((movimiento) => (
                    <tr
                      key={movimiento.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-slate-700">
                        {movimiento.id}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            String(movimiento.tipo)
                              .toLowerCase()
                              .includes('entrada')
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {movimiento.tipo}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-700">
                        {movimiento.referencia}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {movimiento.volumen !== null
                          ? `${movimiento.volumen.toLocaleString(
                              'es-DO'
                            )} gal`
                          : 'N/A'}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {movimiento.fecha}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {movimiento.hora}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modalAbierto && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Nueva recepción
                  </h2>

                  <p className="text-slate-500 mt-1">
                    Completa los datos del combustible recibido
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={26} />
                </button>
              </div>

              <form
                onSubmit={registrarRecepcion}
                className="p-6"
              >
                {cargandoCatalogos ? (
                  <div className="py-16 text-center">
                    <Loader2
                      size={34}
                      className="animate-spin text-blue-600 mx-auto mb-3"
                    />

                    <p className="text-slate-500">
                      Cargando estaciones, suplidores e inventario...
                    </p>
                  </div>
                ) : (
                  <>
                    {errorFormulario && (
                      <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle
                          size={22}
                          className="shrink-0 mt-0.5"
                        />

                        <span>{errorFormulario}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Estación
                        </label>

                        <select
                          name="stationId"
                          value={formulario.stationId}
                          onChange={manejarCambioEstacion}
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="">
                            Seleccione una estación
                          </option>

                          {estaciones.map((estacion) => (
                            <option
                              key={estacion.id_estacion}
                              value={estacion.id_estacion}
                            >
                              {estacion.nombre}
                            </option>
                          ))}
                        </select>

                        {estacionSeleccionada?.ubicacion && (
                          <p className="text-xs text-slate-400 mt-2">
                            {estacionSeleccionada.ubicacion}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Suplidor
                        </label>

                        <select
                          name="supplierId"
                          value={formulario.supplierId}
                          onChange={manejarCambio}
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="">
                            Seleccione un suplidor
                          </option>

                          {suplidores.map((suplidor) => (
                            <option
                              key={suplidor.id_suplidor}
                              value={suplidor.id_suplidor}
                            >
                              {suplidor.nombre} · RNC {suplidor.rnc}
                            </option>
                          ))}
                        </select>

                        {suplidorSeleccionado && (
                          <p className="text-xs text-slate-400 mt-2">
                            RNC: {suplidorSeleccionado.rnc}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Tanque
                        </label>

                        <select
                          name="tankId"
                          value={formulario.tankId}
                          onChange={manejarCambio}
                          disabled={!formulario.stationId}
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">
                            {formulario.stationId
                              ? 'Seleccione un tanque'
                              : 'Seleccione primero una estación'}
                          </option>

                          {tanquesDisponibles.map((tanque) => (
                            <option
                              key={tanque.id_tanque}
                              value={tanque.id_tanque}
                            >
                              Tanque {tanque.id_tanque} ·{' '}
                              {tanque.tipo_combustible}
                            </option>
                          ))}
                        </select>

                        {formulario.stationId &&
                          tanquesDisponibles.length === 0 && (
                            <p className="text-xs text-red-500 mt-2">
                              Esta estación no tiene tanques activos en inventario.
                            </p>
                          )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Número de factura
                        </label>

                        <input
                          type="text"
                          name="invoiceNumber"
                          value={formulario.invoiceNumber}
                          onChange={manejarCambio}
                          placeholder="Ej. F-009988"
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Volumen documentado
                        </label>

                        <div className="relative">
                          <input
                            type="number"
                            name="documentedVolumeGallons"
                            value={
                              formulario.documentedVolumeGallons
                            }
                            onChange={manejarCambio}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />

                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            galones
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Volumen recibido
                        </label>

                        <div className="relative">
                          <input
                            type="number"
                            name="receivedVolumeGallons"
                            value={
                              formulario.receivedVolumeGallons
                            }
                            onChange={manejarCambio}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />

                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            galones
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Fecha de recepción
                        </label>

                        <input
                          type="date"
                          name="receivedAt"
                          value={formulario.receivedAt}
                          onChange={manejarCambio}
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Combustible del tanque
                        </label>

                        <input
                          type="text"
                          value={
                            tanqueSeleccionado?.tipo_combustible ||
                            ''
                          }
                          readOnly
                          placeholder="Seleccione un tanque"
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-slate-50 text-slate-600"
                        />
                      </div>

                      {tanqueSeleccionado && (
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
                          <div>
                            <p className="text-xs text-slate-500">
                              Existencia actual
                            </p>

                            <p className="font-semibold text-slate-800 mt-1">
                              {Number(
                                tanqueSeleccionado.existencia_actual
                              ).toLocaleString('es-DO')}{' '}
                              gal
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Capacidad máxima
                            </p>

                            <p className="font-semibold text-slate-800 mt-1">
                              {Number(
                                tanqueSeleccionado.capacidad_maxima
                              ).toLocaleString('es-DO')}{' '}
                              gal
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Capacidad disponible
                            </p>

                            <p className="font-semibold text-slate-800 mt-1">
                              {capacidadDisponible !== null
                                ? capacidadDisponible.toLocaleString(
                                    'es-DO'
                                  )
                                : 'N/A'}{' '}
                              gal
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Notas
                        </label>

                        <textarea
                          name="notes"
                          value={formulario.notes}
                          onChange={manejarCambio}
                          rows="3"
                          placeholder="Observaciones de la recepción (opcional)"
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    <div className="mt-6 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl p-4">
                      Una recepción confirmada actualizará automáticamente
                      el inventario del tanque correspondiente en el
                      servidor.
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={cerrarModal}
                        disabled={guardando}
                        className="border border-slate-300 text-slate-700 px-5 py-3 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={
                          guardando ||
                          cargandoCatalogos
                        }
                        className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {guardando && (
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />
                        )}

                        {guardando
                          ? 'Registrando...'
                          : 'Registrar recepción'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default Recepcion
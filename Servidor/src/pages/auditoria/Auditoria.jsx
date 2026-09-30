import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  Search,
  ShieldCheck,
  LogIn,
  Pencil,
  Fuel,
  SlidersHorizontal,
  XCircle,
  PlusCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'

import AdminLayout from '../../components/layouts/AdminLayout'
import { API_BASE_URL } from '../../App.jsx'

function Auditoria() {
  const [registros, setRegistros] = useState([])
  const [paginacion, setPaginacion] = useState({
    totalRecords: 0,
    currentPage: 1,
    totalPages: 1,
    limit: 50,
  })

  const [cargando, setCargando] = useState(true)
  const [errorApi, setErrorApi] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [accionFiltro, setAccionFiltro] = useState('')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState('')

  const formatearFechaHora = (timestamp) => {
    if (!timestamp) {
      return {
        fecha: 'N/A',
        hora: 'N/A',
      }
    }

    const fecha = new Date(timestamp)

    if (Number.isNaN(fecha.getTime())) {
      return {
        fecha: 'N/A',
        hora: 'N/A',
      }
    }

    return {
      fecha: fecha.toLocaleDateString('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),

      fechaFiltro: fecha.toISOString().split('T')[0],

      hora: fecha.toLocaleTimeString('es-DO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    }
  }

  const normalizarRegistro = (registro, index) => {
    const fechaHora = formatearFechaHora(
      registro.fecha_hora
    )

    return {
      id: String(
        registro.id_auditoria ??
          `auditoria-${index}`
      ),

      accion:
        registro.accion || 'SIN_ACCION',

      tablaAfectada:
        registro.tabla_afectada || 'N/A',

      detalle:
        registro.detalles ||
        'Sin detalles adicionales',

      ip:
        registro.direccion_ip || 'N/A',

      fecha: fechaHora.fecha,

      fechaFiltro:
        fechaHora.fechaFiltro || '',

      hora: fechaHora.hora,

      usuario:
        registro.nombre_completo ||
        'Usuario no identificado',

      rol:
        registro.rol || 'Sin rol',
    }
  }

  const obtenerListaRegistros = (resultado) => {
    if (Array.isArray(resultado)) {
      return resultado
    }

    if (Array.isArray(resultado?.data)) {
      return resultado.data
    }

    return []
  }

  const cargarAuditoria = useCallback(
    async (pagina = 1) => {
      setCargando(true)
      setErrorApi('')

      try {
        const token = localStorage.getItem(
          'fuelcontrol_token'
        )

        if (!token) {
          throw new Error(
            'No se encontró una sesión válida. Inicia sesión nuevamente.'
          )
        }

        const limite = 50

        const response = await fetch(
          `${API_BASE_URL}/audit?page=${pagina}&limit=${limite}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        )

        let resultado = null

        const contentType =
          response.headers.get('content-type') || ''

        if (
          contentType.includes(
            'application/json'
          )
        ) {
          resultado = await response.json()
        } else {
          const texto = await response.text()

          resultado = {
            success: false,
            message: texto,
          }
        }

        if (response.status === 403) {
          throw new Error(
            'Tu usuario no tiene permisos para consultar los registros de auditoría.'
          )
        }

        if (response.status === 404) {
          throw new Error(
            'No se encontró el endpoint de auditoría.'
          )
        }

        if (!response.ok) {
          throw new Error(
            resultado?.error ||
              resultado?.message ||
              resultado?.mensaje ||
              `No fue posible consultar la auditoría. Código HTTP ${response.status}.`
          )
        }

        if (resultado?.success === false) {
          throw new Error(
            resultado?.error ||
              resultado?.message ||
              resultado?.mensaje ||
              'La API no pudo obtener los registros de auditoría.'
          )
        }

        const lista =
          obtenerListaRegistros(resultado)

        const registrosNormalizados =
          lista.map((registro, index) =>
            normalizarRegistro(
              registro,
              index
            )
          )

        setRegistros(registrosNormalizados)

        if (resultado?.pagination) {
          setPaginacion({
            totalRecords:
              resultado.pagination
                .totalRecords ?? lista.length,

            currentPage:
              resultado.pagination
                .currentPage ?? pagina,

            totalPages:
              resultado.pagination
                .totalPages ?? 1,

            limit:
              resultado.pagination.limit ??
              limite,
          })
        } else {
          setPaginacion({
            totalRecords: lista.length,
            currentPage: pagina,
            totalPages: 1,
            limit: limite,
          })
        }
      } catch (error) {
        console.error(
          'Error cargando auditoría:',
          error
        )

        setRegistros([])

        setErrorApi(
          error.message ||
            'No fue posible conectar con el servidor.'
        )
      } finally {
        setCargando(false)
      }
    },
    []
  )

  useEffect(() => {
    cargarAuditoria(1)
  }, [cargarAuditoria])

  const acciones = useMemo(() => {
    return [
      ...new Set(
        registros
          .map((registro) => registro.accion)
          .filter(Boolean)
      ),
    ].sort()
  }, [registros])

  const usuarios = useMemo(() => {
    return [
      ...new Set(
        registros
          .map(
            (registro) =>
              `${registro.usuario} · ${registro.rol}`
          )
          .filter(Boolean)
      ),
    ].sort()
  }, [registros])

  const registrosFiltrados = useMemo(() => {
    const texto =
      busqueda.trim().toLowerCase()

    return registros.filter((registro) => {
      const usuarioCompleto =
        `${registro.usuario} · ${registro.rol}`

      const coincideBusqueda =
        !texto ||
        registro.accion
          .toLowerCase()
          .includes(texto) ||
        registro.tablaAfectada
          .toLowerCase()
          .includes(texto) ||
        registro.usuario
          .toLowerCase()
          .includes(texto) ||
        registro.rol
          .toLowerCase()
          .includes(texto) ||
        registro.ip
          .toLowerCase()
          .includes(texto) ||
        registro.detalle
          .toLowerCase()
          .includes(texto)

      const coincideAccion =
        !accionFiltro ||
        registro.accion === accionFiltro

      const coincideUsuario =
        !usuarioFiltro ||
        usuarioCompleto === usuarioFiltro

      const coincideFecha =
        !fechaFiltro ||
        registro.fechaFiltro === fechaFiltro

      return (
        coincideBusqueda &&
        coincideAccion &&
        coincideUsuario &&
        coincideFecha
      )
    })
  }, [
    registros,
    busqueda,
    accionFiltro,
    usuarioFiltro,
    fechaFiltro,
  ])

  const limpiarFiltros = () => {
    setBusqueda('')
    setAccionFiltro('')
    setUsuarioFiltro('')
    setFechaFiltro('')
  }

  const obtenerTipoVisual = (accion) => {
    const codigo = String(
      accion || ''
    ).toUpperCase()

    if (
      codigo.includes('LOGIN') ||
      codigo.includes('ACCESO')
    ) {
      return 'Acceso'
    }

    if (
      codigo.includes('CREAR') ||
      codigo.includes('EMITIR') ||
      codigo.includes('ACTIVAR')
    ) {
      return 'Creación'
    }

    if (
      codigo.includes('MODIFICAR') ||
      codigo.includes('EDITAR') ||
      codigo.includes('ACTUALIZAR')
    ) {
      return 'Modificación'
    }

    if (
      codigo.includes('DESPACH')
    ) {
      return 'Despacho'
    }

    if (
      codigo.includes('AJUST')
    ) {
      return 'Ajuste'
    }

    if (
      codigo.includes('ANULAR') ||
      codigo.includes('CANCELAR') ||
      codigo.includes('DESACTIVAR') ||
      codigo.includes('ELIMINAR')
    ) {
      return 'Cancelación'
    }

    return 'Otro'
  }

  const iconoAccion = (accion) => {
    const tipo = obtenerTipoVisual(accion)

    if (tipo === 'Acceso') {
      return <LogIn size={18} />
    }

    if (tipo === 'Creación') {
      return <PlusCircle size={18} />
    }

    if (tipo === 'Modificación') {
      return <Pencil size={18} />
    }

    if (tipo === 'Despacho') {
      return <Fuel size={18} />
    }

    if (tipo === 'Ajuste') {
      return (
        <SlidersHorizontal size={18} />
      )
    }

    if (tipo === 'Cancelación') {
      return <XCircle size={18} />
    }

    return <ShieldCheck size={18} />
  }

  const clasesAccion = (accion) => {
    const tipo = obtenerTipoVisual(accion)

    if (tipo === 'Acceso') {
      return 'bg-blue-100 text-blue-700'
    }

    if (tipo === 'Creación') {
      return 'bg-green-100 text-green-700'
    }

    if (tipo === 'Modificación') {
      return 'bg-amber-100 text-amber-700'
    }

    if (tipo === 'Despacho') {
      return 'bg-cyan-100 text-cyan-700'
    }

    if (tipo === 'Ajuste') {
      return 'bg-purple-100 text-purple-700'
    }

    if (tipo === 'Cancelación') {
      return 'bg-red-100 text-red-700'
    }

    return 'bg-slate-100 text-slate-700'
  }

  const cambiarPagina = (pagina) => {
    if (
      pagina < 1 ||
      pagina > paginacion.totalPages ||
      pagina === paginacion.currentPage ||
      cargando
    ) {
      return
    }

    limpiarFiltros()
    cargarAuditoria(pagina)
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Auditoría y Trazabilidad
            </h1>

            <p className="text-slate-500 mt-2">
              Consulta de eventos y acciones
              realizadas dentro del sistema
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              cargarAuditoria(
                paginacion.currentPage
              )
            }
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-4 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
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

        {errorApi && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle
              size={24}
              className="shrink-0 mt-0.5"
            />

            <div>
              <p className="font-semibold">
                No se pudo cargar la auditoría
              </p>

              <p className="text-sm mt-1">
                {errorApi}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Registros encontrados
            </p>

            <p className="text-3xl font-bold text-slate-800 mt-2">
              {cargando
                ? '-'
                : paginacion.totalRecords}
            </p>

            {!cargando &&
              registrosFiltrados.length !==
                registros.length && (
                <p className="text-xs text-slate-400 mt-2">
                  {
                    registrosFiltrados.length
                  }{' '}
                  visibles con los filtros
                  actuales
                </p>
              )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Usuarios en esta página
            </p>

            <p className="text-3xl font-bold text-slate-800 mt-2">
              {cargando ? '-' : usuarios.length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-700 p-3 rounded-xl">
                <ShieldCheck size={24} />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Trazabilidad
                </p>

                <p className="font-semibold text-slate-800">
                  {errorApi
                    ? 'Error de consulta'
                    : 'Registro activo'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6">
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Acción
              </label>

              <select
                value={accionFiltro}
                onChange={(e) =>
                  setAccionFiltro(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              >
                <option value="">
                  Todas
                </option>

                {acciones.map((accion) => (
                  <option
                    key={accion}
                    value={accion}
                  >
                    {accion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Usuario
              </label>

              <select
                value={usuarioFiltro}
                onChange={(e) =>
                  setUsuarioFiltro(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              >
                <option value="">
                  Todos
                </option>

                {usuarios.map((usuario) => (
                  <option
                    key={usuario}
                    value={usuario}
                  >
                    {usuario}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha
              </label>

              <input
                type="date"
                value={fechaFiltro}
                onChange={(e) =>
                  setFechaFiltro(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
                placeholder="Buscar en auditoría..."
                className="w-full border border-slate-300 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {!cargando &&
              paginacion.totalRecords >
                0 && (
                <p className="text-sm text-slate-500">
                  Página{' '}
                  {
                    paginacion.currentPage
                  }{' '}
                  de{' '}
                  {paginacion.totalPages} ·{' '}
                  {
                    paginacion.totalRecords
                  }{' '}
                  registros
                </p>
              )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Acción
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Usuario
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Fecha
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Hora
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    IP
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Detalle
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
                        Cargando registros del servidor...
                      </p>
                    </td>
                  </tr>
                ) : registrosFiltrados
                    .length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-12"
                    >
                      <ShieldCheck
                        size={36}
                        className="mx-auto text-slate-300 mb-3"
                      />

                      <p className="font-medium text-slate-600">
                        No hay registros de auditoría para mostrar.
                      </p>

                      <p className="text-sm text-slate-400 mt-1">
                        {errorApi
                          ? 'No fue posible obtener los registros desde el servidor.'
                          : 'No se encontraron registros que coincidan con los filtros seleccionados.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  registrosFiltrados.map(
                    (registro) => (
                      <tr
                        key={registro.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span
                              className={`inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${clasesAccion(
                                registro.accion
                              )}`}
                            >
                              {iconoAccion(
                                registro.accion
                              )}

                              {registro.accion}
                            </span>

                            <span className="text-xs text-slate-400">
                              {
                                registro.tablaAfectada
                              }
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-slate-700">
                            {registro.usuario}
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            {registro.rol}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {registro.fecha}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {registro.hora}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 whitespace-nowrap">
                            {registro.ip}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 min-w-[280px]">
                          {registro.detalle}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {!cargando &&
            !errorApi &&
            paginacion.totalPages > 1 && (
              <div className="p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-500">
                  Página{' '}
                  {
                    paginacion.currentPage
                  }{' '}
                  de{' '}
                  {paginacion.totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      cambiarPagina(
                        paginacion.currentPage -
                          1
                      )
                    }
                    disabled={
                      paginacion.currentPage <=
                        1 || cargando
                    }
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      cambiarPagina(
                        paginacion.currentPage +
                          1
                      )
                    }
                    disabled={
                      paginacion.currentPage >=
                        paginacion.totalPages ||
                      cargando
                    }
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default Auditoria
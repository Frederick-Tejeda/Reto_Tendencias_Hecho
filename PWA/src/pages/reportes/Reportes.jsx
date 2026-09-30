import { useMemo, useState, useEffect } from 'react'
import {
  Search,
  FileSpreadsheet,
  FileText,
  Download,
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react'

import AdminLayout from '../../components/layouts/AdminLayout'
import { API_BASE_URL } from '../../App.jsx'

function Reportes() {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorApi, setErrorApi] = useState('')
  const [exportando, setExportando] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [empleado, setEmpleado] = useState('')
  const [vehiculo, setVehiculo] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [combustible, setCombustible] = useState('')
  const [estado, setEstado] = useState('')

  const obtenerToken = () => {
    return localStorage.getItem('fuelcontrol_token')
  }

  const obtenerHeaders = () => ({
    Authorization: `Bearer ${obtenerToken()}`,
    Accept: 'application/json',
  })

  const leerRespuesta = async (response) => {
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      return await response.json()
    }

    const texto = await response.text()

    return {
      success: false,
      message:
        texto ||
        'El servidor devolvió una respuesta que no tiene formato JSON.',
    }
  }

  const obtenerListaReporte = (resultado) => {
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

  /*
   * Este mapeo utiliza la estructura que devuelve actualmente
   * GET /api/v1/reports/general.
   */
  const mapearRegistro = (item, indice) => ({
    id:
      item.id ??
      item.uuid ??
      item.secuencia ??
      `reporte-${indice}`,

    secuencia:
      item.secuencia ??
      item.sequentialId ??
      'N/A',

    empleado:
      item.codigo_empleado ??
      item.employeeCode ??
      item.employeeName ??
      'N/A',

    vehiculo:
      item.ficha_interna ??
      item.vehicleCode ??
      item.internalCode ??
      'N/A',

    departamento:
      item.departamento ??
      item.departmentName ??
      item.department ??
      'N/A',

    cantidad: Number(
      item.cantidad_autorizada ??
        item.authorizedQuantityGal ??
        item.dispatchedQuantityGal ??
        0
    ),

    combustible:
      item.tipo_combustible ??
      item.fuelType ??
      'No definido',

    estado:
      item.estado ??
      item.status ??
      'Desconocido',

    fecha: String(
      item.fecha_creacion ??
        item.createdAt ??
        ''
    ).split('T')[0],
  })

  const cargarReporte = async () => {
    setCargando(true)
    setErrorApi('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/reports/general`,
        {
          method: 'GET',
          headers: obtenerHeaders(),
        }
      )

      const resultado = await leerRespuesta(response)

      if (!response.ok) {
        setDatos([])

        setErrorApi(
          resultado?.error ||
            resultado?.message ||
            resultado?.mensaje ||
            `No fue posible cargar el reporte. Código HTTP ${response.status}.`
        )

        return
      }

      if (resultado?.success === false) {
        setDatos([])

        setErrorApi(
          resultado?.error ||
            resultado?.message ||
            resultado?.mensaje ||
            'El servidor no pudo generar el reporte.'
        )

        return
      }

      const lista = obtenerListaReporte(resultado)

      setDatos(
        lista.map((item, indice) =>
          mapearRegistro(item, indice)
        )
      )
    } catch (error) {
      console.error('Error cargando reporte:', error)

      setDatos([])

      setErrorApi(
        'Error de red al intentar conectar con el servidor de reportes.'
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarReporte()
  }, [])

  const empleados = useMemo(
    () => [
      ...new Set(
        datos
          .map((item) => item.empleado)
          .filter(
            (item) =>
              item &&
              item !== 'N/A'
          )
      ),
    ],
    [datos]
  )

  const vehiculos = useMemo(
    () => [
      ...new Set(
        datos
          .map((item) => item.vehiculo)
          .filter(
            (item) =>
              item &&
              item !== 'N/A'
          )
      ),
    ],
    [datos]
  )

  const departamentos = useMemo(
    () => [
      ...new Set(
        datos
          .map((item) => item.departamento)
          .filter(
            (item) =>
              item &&
              item !== 'N/A'
          )
      ),
    ],
    [datos]
  )

  const combustibles = useMemo(
    () => [
      ...new Set(
        datos
          .map((item) => item.combustible)
          .filter(
            (item) =>
              item &&
              item !== 'No definido'
          )
      ),
    ],
    [datos]
  )

  const estados = useMemo(
    () => [
      ...new Set(
        datos
          .map((item) => item.estado)
          .filter(
            (item) =>
              item &&
              item !== 'Desconocido'
          )
      ),
    ],
    [datos]
  )

  const resultados = useMemo(() => {
    return datos.filter((item) => {
      const texto = busqueda
        .trim()
        .toLowerCase()

      const coincideBusqueda =
        !texto ||
        String(item.secuencia)
          .toLowerCase()
          .includes(texto) ||
        String(item.empleado)
          .toLowerCase()
          .includes(texto) ||
        String(item.vehiculo)
          .toLowerCase()
          .includes(texto) ||
        String(item.departamento)
          .toLowerCase()
          .includes(texto) ||
        String(item.combustible)
          .toLowerCase()
          .includes(texto) ||
        String(item.estado)
          .toLowerCase()
          .includes(texto)

      const coincideFechaDesde =
        !fechaDesde ||
        !item.fecha ||
        item.fecha >= fechaDesde

      const coincideFechaHasta =
        !fechaHasta ||
        !item.fecha ||
        item.fecha <= fechaHasta

      const coincideEmpleado =
        !empleado ||
        item.empleado === empleado

      const coincideVehiculo =
        !vehiculo ||
        item.vehiculo === vehiculo

      const coincideDepartamento =
        !departamento ||
        item.departamento === departamento

      const coincideCombustible =
        !combustible ||
        item.combustible === combustible

      const coincideEstado =
        !estado ||
        item.estado === estado

      return (
        coincideBusqueda &&
        coincideFechaDesde &&
        coincideFechaHasta &&
        coincideEmpleado &&
        coincideVehiculo &&
        coincideDepartamento &&
        coincideCombustible &&
        coincideEstado
      )
    })
  }, [
    datos,
    busqueda,
    fechaDesde,
    fechaHasta,
    empleado,
    vehiculo,
    departamento,
    combustible,
    estado,
  ])

  const totalGalones = resultados.reduce(
    (total, item) =>
      total + Number(item.cantidad || 0),
    0
  )

  const limpiarFiltros = () => {
    setBusqueda('')
    setFechaDesde('')
    setFechaHasta('')
    setEmpleado('')
    setVehiculo('')
    setDepartamento('')
    setCombustible('')
    setEstado('')
  }

  const construirParametrosReporte = (
    incluirFormato = false
  ) => {
    const params = new URLSearchParams()

    if (fechaDesde) {
      params.append('startDate', fechaDesde)
    }

    if (fechaHasta) {
      params.append('endDate', fechaHasta)
    }

    if (empleado) {
      params.append('employee', empleado)
    }

    if (vehiculo) {
      params.append('vehicle', vehiculo)
    }

    if (departamento) {
      params.append(
        'department',
        departamento
      )
    }

    if (combustible) {
      params.append(
        'fuelType',
        combustible
      )
    }

    if (estado) {
      params.append('status', estado)
    }

    if (incluirFormato) {
      params.append('format', 'excel')
    }

    return params
  }

  const descargarReporteOficial = async () => {
    setExportando(true)
    setErrorApi('')

    try {
      const params =
        construirParametrosReporte(true)

      const query = params.toString()

      const response = await fetch(
        `${API_BASE_URL}/reports/general${
          query ? `?${query}` : ''
        }`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${obtenerToken()}`,
          },
        }
      )

      if (!response.ok) {
        let mensaje = ''

        try {
          const errorServidor =
            await response.json()

          mensaje =
            errorServidor?.error ||
            errorServidor?.message ||
            errorServidor?.mensaje ||
            ''
        } catch {
          // La respuesta de error puede no ser JSON.
        }

        throw new Error(
          mensaje ||
            `El servidor rechazó la descarga. Código HTTP ${response.status}.`
        )
      }

      const blob = await response.blob()

      const url =
        URL.createObjectURL(blob)

      const enlace =
        document.createElement('a')

      enlace.href = url

      enlace.download =
        `Reporte_Combustible_${
          new Date()
            .toISOString()
            .split('T')[0]
        }.xlsx`

      document.body.appendChild(enlace)

      enlace.click()
      enlace.remove()

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(
        'Error exportando Excel:',
        error
      )

      setErrorApi(
        error.message ||
          'No fue posible descargar el reporte.'
      )
    } finally {
      setExportando(false)
    }
  }

  const descargarArchivo = (
    contenido,
    nombre,
    tipo
  ) => {
    const blob = new Blob(
      [contenido],
      { type: tipo }
    )

    const url =
      URL.createObjectURL(blob)

    const enlace =
      document.createElement('a')

    enlace.href = url
    enlace.download = nombre

    document.body.appendChild(enlace)

    enlace.click()
    enlace.remove()

    URL.revokeObjectURL(url)
  }

  const escaparCSV = (valor) => {
    const texto = String(
      valor ?? ''
    ).replace(/"/g, '""')

    return `"${texto}"`
  }

  const exportarCSV = () => {
    const encabezado = [
      'Secuencia',
      'Fecha',
      'Código empleado',
      'Ficha interna',
      'Departamento',
      'Combustible',
      'Estado',
      'Cantidad autorizada',
    ].join(',')

    const filas = resultados.map(
      (item) =>
        [
          item.secuencia,
          item.fecha,
          item.empleado,
          item.vehiculo,
          item.departamento,
          item.combustible,
          item.estado,
          item.cantidad,
        ]
          .map(escaparCSV)
          .join(',')
    )

    descargarArchivo(
      '\uFEFF' +
        [encabezado, ...filas].join(
          '\n'
        ),
      'reporte-combustible.csv',
      'text/csv;charset=utf-8;'
    )
  }

  const escaparHTML = (valor) => {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const exportarPDF = () => {
    const ventana = window.open(
      '',
      '_blank'
    )

    if (!ventana) {
      alert(
        'El navegador bloqueó la ventana de impresión.'
      )

      return
    }

    const filas = resultados
      .map(
        (item) => `
          <tr>
            <td>${escaparHTML(
              item.secuencia
            )}</td>

            <td>${escaparHTML(
              item.fecha
            )}</td>

            <td>${escaparHTML(
              item.empleado
            )}</td>

            <td>${escaparHTML(
              item.vehiculo
            )}</td>

            <td>${escaparHTML(
              item.departamento
            )}</td>

            <td>${escaparHTML(
              item.combustible
            )}</td>

            <td>${escaparHTML(
              item.estado
            )}</td>

            <td>${escaparHTML(
              item.cantidad
            )} gal</td>
          </tr>
        `
      )
      .join('')

    ventana.document.write(`
      <html>
        <head>
          <meta charset="UTF-8">
          <title>
            Reporte de Combustible
          </title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
            }

            h1 {
              margin-bottom: 6px;
            }

            p {
              color: #555;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 25px;
            }

            th,
            td {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: left;
              font-size: 12px;
            }

            th {
              background: #f1f5f9;
            }
          </style>
        </head>

        <body>
          <h1>
            Reporte de Combustible
          </h1>

          <p>
            Total de registros:
            ${resultados.length}
          </p>

          <p>
            Total de galones:
            ${totalGalones.toLocaleString()}
          </p>

          <table>
            <thead>
              <tr>
                <th>Secuencia</th>
                <th>Fecha</th>
                <th>Código empleado</th>
                <th>Ficha interna</th>
                <th>Departamento</th>
                <th>Combustible</th>
                <th>Estado</th>
                <th>Cantidad autorizada</th>
              </tr>
            </thead>

            <tbody>
              ${filas}
            </tbody>
          </table>

          <script>
            window.onload = function () {
              window.print()
            }
          </script>
        </body>
      </html>
    `)

    ventana.document.close()
  }

  const obtenerClaseEstado = (
    estadoActual
  ) => {
    const valor = String(
      estadoActual ?? ''
    ).toLowerCase()

    if (
      valor === 'activo' ||
      valor === 'pendiente'
    ) {
      return 'bg-blue-100 text-blue-700'
    }

    if (
      valor === 'despachado' ||
      valor === 'consumido' ||
      valor === 'completado'
    ) {
      return 'bg-green-100 text-green-700'
    }

    if (
      valor === 'anulado' ||
      valor === 'cancelado' ||
      valor === 'vencido'
    ) {
      return 'bg-red-100 text-red-700'
    }

    return 'bg-slate-100 text-slate-700'
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Reportes
          </h1>

          <p className="text-slate-500 mt-2">
            Consulta, filtrado y exportación
            de información de combustible
          </p>
        </div>

        {errorApi && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 shadow-sm">
            <AlertCircle
              size={24}
              className="shrink-0 mt-0.5"
            />

            <div>
              <p className="font-semibold text-sm">
                No se pudo completar la operación
              </p>

              <p className="text-sm mt-1">
                {errorApi}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6">
          <div className="p-5 border-b border-slate-200 flex items-center gap-2">
            <Filter
              size={20}
              className="text-blue-600"
            />

            <h2 className="font-semibold text-slate-800">
              Filtros del reporte
            </h2>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha desde
              </label>

              <input
                type="date"
                value={fechaDesde}
                onChange={(e) =>
                  setFechaDesde(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha hasta
              </label>

              <input
                type="date"
                value={fechaHasta}
                onChange={(e) =>
                  setFechaHasta(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Código empleado
              </label>

              <select
                value={empleado}
                onChange={(e) =>
                  setEmpleado(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              >
                <option value="">
                  Todos
                </option>

                {empleados.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ficha interna
              </label>

              <select
                value={vehiculo}
                onChange={(e) =>
                  setVehiculo(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              >
                <option value="">
                  Todos
                </option>

                {vehiculos.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Departamento
              </label>

              <select
                value={departamento}
                onChange={(e) =>
                  setDepartamento(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              >
                <option value="">
                  Todos
                </option>

                {departamentos.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de combustible
              </label>

              <select
                value={combustible}
                onChange={(e) =>
                  setCombustible(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              >
                <option value="">
                  Todos
                </option>

                {combustibles.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Estado
              </label>

              <select
                value={estado}
                onChange={(e) =>
                  setEstado(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              >
                <option value="">
                  Todos
                </option>

                {estados.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Registros encontrados
            </p>

            <p className="text-3xl font-bold text-slate-800 mt-2">
              {cargando
                ? '-'
                : resultados.length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total de combustible autorizado
            </p>

            <p className="text-3xl font-bold text-slate-800 mt-2">
              {cargando
                ? '-'
                : totalGalones.toLocaleString()}
            </p>

            <p className="text-sm text-slate-400">
              galones
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(
                    e.target.value
                  )
                }
                placeholder="Buscar en resultados..."
                className="w-full border border-slate-300 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  descargarReporteOficial
                }
                disabled={exportando}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {exportando ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <FileSpreadsheet
                    size={18}
                  />
                )}

                Excel
              </button>

              <button
                type="button"
                onClick={exportarCSV}
                disabled={
                  resultados.length === 0
                }
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                <Download size={18} />
                CSV
              </button>

              <button
                type="button"
                onClick={exportarPDF}
                disabled={
                  resultados.length === 0
                }
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                <FileText size={18} />
                PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Secuencia
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Fecha
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Código empleado
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Ficha interna
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Departamento
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Combustible
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Estado
                  </th>

                  <th className="text-left px-5 py-4 text-sm font-semibold text-slate-600">
                    Cantidad autorizada
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-10"
                    >
                      <Loader2
                        size={32}
                        className="animate-spin text-blue-600 mx-auto mb-2"
                      />

                      <p className="text-slate-500">
                        Cargando datos para el reporte...
                      </p>
                    </td>
                  </tr>
                ) : resultados.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-10 text-slate-500"
                    >
                      No se encontraron resultados para visualizar en la tabla.
                    </td>
                  </tr>
                ) : (
                  resultados.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-medium text-slate-800 whitespace-nowrap">
                          {item.secuencia}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {item.fecha ||
                            '—'}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {item.empleado}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {item.vehiculo}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {
                            item.departamento
                          }
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {
                            item.combustible
                          }
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${obtenerClaseEstado(
                              item.estado
                            )}`}
                          >
                            {item.estado}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">
                          {item.cantidad}{' '}
                          gal
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
    </AdminLayout>
  )
}

export default Reportes
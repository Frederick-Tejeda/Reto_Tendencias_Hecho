import { useState } from 'react'

import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  ShieldCheck,
} from 'lucide-react'

import AdminLayout from '../../components/layouts/AdminLayout'
import { API_BASE_URL } from '../../App.jsx'

const usuarioLoggeadoRol = JSON.parse(localStorage.getItem("fuelcontrol_usuario"))?.rol;

function obtenerFechaLocal() {
  const ahora = new Date()

  const year = ahora.getFullYear()
  const month = String(ahora.getMonth() + 1).padStart(2, '0')
  const day = String(ahora.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function obtenerNombreArchivo(contentDisposition, fecha) {
  if (contentDisposition) {
    const utf8Match = contentDisposition.match(
      /filename\*=UTF-8''([^;]+)/i,
    )

    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(
          utf8Match[1].replace(/["']/g, '').trim(),
        )
      } catch {
        return utf8Match[1].replace(/["']/g, '').trim()
      }
    }

    const filenameMatch = contentDisposition.match(
      /filename="?([^"]+)"?/i,
    )

    if (filenameMatch?.[1]) {
      return filenameMatch[1].trim()
    }
  }

  return `cierre-diario-${fecha}.xlsx`
}

function CierreDiario() {
  const [fechaCierre, setFechaCierre] = useState(obtenerFechaLocal())
  const [generando, setGenerando] = useState(false)
  const [mensajeError, setMensajeError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [ultimoCierre, setUltimoCierre] = useState(null)

  const generarCierreDiario = async () => {
    if (!fechaCierre) {
      setMensajeError('Selecciona la fecha que deseas cerrar.')
      return
    }

    const token = localStorage.getItem('fuelcontrol_token')

    if (!token) {
      setMensajeError(
        'No se encontró una sesión válida. Inicia sesión nuevamente.',
      )
      return
    }

    setGenerando(true)
    setMensajeError('')
    setMensajeExito('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/reports/daily-close`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: fechaCierre,
          }),
        },
      )

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''

        let mensaje =
          'No fue posible generar el cierre diario.'

        if (contentType.includes('application/json')) {
          const errorData = await response.json().catch(() => null)

          mensaje =
            errorData?.message ||
            errorData?.Message ||
            errorData?.error ||
            mensaje
        } else {
          const texto = await response.text().catch(() => '')

          if (texto && texto.length < 300) {
            mensaje = texto
          }
        }

        throw new Error(mensaje)
      }

      const contentType = response.headers.get('content-type') || ''

      if (
        !contentType.includes(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ) &&
        !contentType.includes('application/octet-stream')
      ) {
        throw new Error(
          'El servidor respondió correctamente, pero no devolvió el archivo Excel esperado.',
        )
      }

      const archivo = await response.blob()

      if (!archivo.size) {
        throw new Error(
          'El servidor devolvió un archivo vacío.',
        )
      }

      const contentDisposition = response.headers.get(
        'content-disposition',
      )

      const nombreArchivo = obtenerNombreArchivo(
        contentDisposition,
        fechaCierre,
      )

      const urlArchivo = window.URL.createObjectURL(archivo)
      const enlace = document.createElement('a')

      enlace.href = urlArchivo
      enlace.download = nombreArchivo

      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()

      window.setTimeout(() => {
        window.URL.revokeObjectURL(urlArchivo)
      }, 1000)

      const ahora = new Date()

      setUltimoCierre({
        fecha: fechaCierre,
        archivo: nombreArchivo,
        hora: ahora.toLocaleTimeString('es-DO', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })

      setMensajeExito(
        'El cierre diario fue procesado correctamente y el reporte Excel fue generado.',
      )
    } catch (error) {
      console.error('Error generando cierre diario:', error)

      setMensajeError(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado al generar el cierre diario.',
      )
    } finally {
      setGenerando(false)
    }
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Cierre Diario
            </h1>

            <p className="text-slate-500 mt-2">
              Generación del cierre de operaciones de combustible
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700">
            <ShieldCheck size={18} />

            <span className="text-sm font-medium">
              Operación de Despachador
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-700 p-3 rounded-xl">
                  <ClipboardCheck size={24} />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Generar cierre diario
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Selecciona la fecha de las operaciones que deseas
                    procesar.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="max-w-md">
                <label
                  htmlFor="fecha-cierre"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Fecha del cierre
                </label>

                <div className="relative">
                  <CalendarDays
                    size={19}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />

                  <input
                    id="fecha-cierre"
                    type="date"
                    value={fechaCierre}
                    max={obtenerFechaLocal()}
                    onChange={(event) => {
                      setFechaCierre(event.target.value)
                      setMensajeError('')
                      setMensajeExito('')
                    }}
                    disabled={generando}
                    className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  No se permiten fechas posteriores al día actual.
                </p>
              </div>

              {mensajeError && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-red-800">
                    No se pudo generar el cierre
                  </p>

                  <p className="text-sm text-red-700 mt-1">
                    {mensajeError}
                  </p>
                </div>
              )}

              {mensajeExito && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <CheckCircle2
                      size={21}
                      className="text-green-600 shrink-0 mt-0.5"
                    />

                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        Cierre generado correctamente
                      </p>

                      <p className="text-sm text-green-700 mt-1">
                        {mensajeExito}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-7">
                <button
                  type="button"
                  onClick={() => { if(usuarioLoggeadoRol !== "Audiencia"){ generarCierreDiario() } }}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-colors ${
                    generando || !fechaCierre
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {generando ? (
                    <>
                      <Loader2 size={19} className="animate-spin" />
                      Procesando cierre...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet size={19} />
                      Generar cierre y descargar Excel
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                Estado
              </h2>
            </div>

            <div className="p-6">
              {ultimoCierre ? (
                <div>
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-4">
                    <CheckCircle2 size={25} />
                  </div>

                  <p className="font-semibold text-slate-800">
                    Último cierre procesado
                  </p>

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Fecha
                      </p>

                      <p className="text-sm font-medium text-slate-700 mt-1">
                        {ultimoCierre.fecha}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Hora
                      </p>

                      <p className="text-sm font-medium text-slate-700 mt-1">
                        {ultimoCierre.hora}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Archivo
                      </p>

                      <div className="flex items-start gap-2 mt-1">
                        <Download
                          size={16}
                          className="text-slate-400 shrink-0 mt-0.5"
                        />

                        <p className="text-sm font-medium text-slate-700 break-all">
                          {ultimoCierre.archivo}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
                    <FileSpreadsheet size={25} />
                  </div>

                  <p className="font-semibold text-slate-800">
                    Pendiente
                  </p>

                  <p className="text-sm text-slate-500 mt-2">
                    En esta sesión todavía no se ha generado un cierre
                    diario.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <div className="flex gap-3">
            <Info
              size={21}
              className="text-blue-600 shrink-0 mt-0.5"
            />

            <div>
              <p className="font-semibold text-blue-900">
                Información del cierre
              </p>

              <p className="text-sm text-blue-800 mt-1 leading-6">
                El cierre se procesa con la sesión autenticada del
                Despachador. El servidor identifica al usuario y su
                estación mediante la sesión y genera el reporte Excel
                correspondiente a la fecha seleccionada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default CierreDiario
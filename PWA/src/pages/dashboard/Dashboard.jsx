import { useCallback, useEffect, useState } from 'react'

import AdminLayout from '../../components/layouts/AdminLayout'

import {
  Fuel,
  Gauge,
  TicketCheck,
  TicketX,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { API_BASE_URL } from '../../App.jsx'

const resumenInicial = {
  inventarioActual: 0,
  combustibleDespachado: 0,
  ticketsActivos: 0,
  ticketsVencidos: 0,
}

function Dashboard() {
  const [resumen, setResumen] = useState(resumenInicial)

  const [consumoDepartamentos, setConsumoDepartamentos] = useState([])
  const [consumoVehiculos, setConsumoVehiculos] = useState([])

  const [cargando, setCargando] = useState(true)
  const [errorApi, setErrorApi] = useState('')

  const convertirNumero = (valor) => {
    const numero = Number(valor)
    return Number.isFinite(numero) ? numero : 0
  }

  const normalizarConsumoDepartamentos = (datos) => {
    if (!Array.isArray(datos)) {
      return []
    }

    return datos.map((item, index) => ({
      id:
        item.id ??
        item.departmentId ??
        item.id_departamento ??
        `departamento-${index}`,

      nombre:
        item.nombre ??
        item.name ??
        item.departmentName ??
        item.department ??
        item.departamento ??
        `Departamento ${index + 1}`,

      galones: convertirNumero(
        item.galones ??
        item.gallons ??
        item.consumption ??
        item.totalConsumption ??
        item.totalGallons ??
        item.cantidad ??
        item.quantity ??
        0
      ),
    }))
  }

  const normalizarConsumoVehiculos = (datos) => {
    if (!Array.isArray(datos)) {
      return []
    }

    return datos.map((item, index) => ({
      id:
        item.id ??
        item.vehicleId ??
        item.id_vehiculo ??
        `vehiculo-${index}`,

      nombre:
        item.nombre ??
        item.name ??
        item.internalCode ??
        item.vehicleCode ??
        item.licensePlate ??
        item.plate ??
        item.vehiculo ??
        `Vehículo ${index + 1}`,

      galones: convertirNumero(
        item.galones ??
        item.gallons ??
        item.consumption ??
        item.totalConsumption ??
        item.totalGallons ??
        item.cantidad ??
        item.quantity ??
        0
      ),
    }))
  }

  const cargarDashboard = useCallback(async () => {
    setCargando(true)
    setErrorApi('')

    try {
      const token = localStorage.getItem('fuelcontrol_token')

      if (!token) {
        throw new Error(
          'No se encontró una sesión válida. Inicia sesión nuevamente.'
        )
      }

      const response = await fetch(
        `${API_BASE_URL}/dashboard/summary`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      const contentType = response.headers.get('content-type') || ''

      let result

      if (contentType.includes('application/json')) {
        result = await response.json()
      } else {
        const texto = await response.text()

        result = {
          success: false,
          message: texto || `Respuesta HTTP ${response.status}`,
        }
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            result?.mensaje ||
            `No fue posible cargar el dashboard. Código HTTP ${response.status}.`
        )
      }

      if (result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            result?.mensaje ||
            'La API no pudo obtener las métricas del dashboard.'
        )
      }

      const data = result?.data ?? {}

      setResumen({
        inventarioActual: convertirNumero(data.inventoryActual),
        combustibleDespachado: convertirNumero(data.dispatchedToday),
        ticketsActivos: convertirNumero(data.activeTickets),
        ticketsVencidos: convertirNumero(data.expiredTickets),
      })

      setConsumoDepartamentos(
        normalizarConsumoDepartamentos(
          data.consumptionByDepartment
        )
      )

      setConsumoVehiculos(
        normalizarConsumoVehiculos(
          data.consumptionByVehicle
        )
      )
    } catch (error) {
      console.error('Error cargando dashboard:', error)

      setResumen(resumenInicial)
      setConsumoDepartamentos([])
      setConsumoVehiculos([])

      setErrorApi(
        error.message ||
          'No fue posible conectar con el servidor.'
      )
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarDashboard()
  }, [cargarDashboard])

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
              Dashboard Ejecutivo
            </h1>

            <p className="text-sm md:text-base text-slate-500 mt-2">
              Resumen general del sistema de gestión de combustible
            </p>
          </div>

          <button
            type="button"
            onClick={cargarDashboard}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-4 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              size={18}
              className={cargando ? 'animate-spin' : ''}
            />

            Actualizar
          </button>
        </div>

        {errorApi && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 shadow-sm">
            <AlertCircle
              size={24}
              className="shrink-0 mt-0.5"
            />

            <div>
              <p className="font-semibold">
                No fue posible cargar las métricas
              </p>

              <p className="text-sm mt-1">
                {errorApi}
              </p>
            </div>
          </div>
        )}

        {cargando ? (
          <div className="flex flex-col items-center justify-center py-24 text-blue-600">
            <Loader2
              size={48}
              className="animate-spin mb-4"
            />

            <p className="font-semibold text-slate-600">
              Cargando métricas del sistema...
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
              <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-bl-full -z-10" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-slate-500">
                      Inventario actual
                    </p>

                    <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1 md:mt-2">
                      {resumen.inventarioActual.toLocaleString()}
                    </p>

                    <p className="text-xs md:text-sm text-slate-400 mt-1">
                      galones
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white p-3 md:p-4 rounded-xl shrink-0 shadow-lg shadow-blue-500/30">
                    <Fuel
                      size={24}
                      className="md:w-[28px] md:h-[28px]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-bl-full -z-10" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-slate-500">
                      Combustible despachado hoy
                    </p>

                    <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1 md:mt-2">
                      {resumen.combustibleDespachado.toLocaleString()}
                    </p>

                    <p className="text-xs md:text-sm text-slate-400 mt-1">
                      galones
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-cyan-500 to-teal-400 text-white p-3 md:p-4 rounded-xl shrink-0 shadow-lg shadow-cyan-500/30">
                    <Gauge
                      size={24}
                      className="md:w-[28px] md:h-[28px]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-slate-500">
                      Tickets activos
                    </p>

                    <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1 md:mt-2">
                      {resumen.ticketsActivos.toLocaleString()}
                    </p>

                    <p className="text-xs md:text-sm text-slate-400 mt-1">
                      tickets
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-400 to-orange-400 text-white p-3 md:p-4 rounded-xl shrink-0 shadow-lg shadow-amber-400/30">
                    <TicketCheck
                      size={24}
                      className="md:w-[28px] md:h-[28px]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -z-10" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-slate-500">
                      Tickets vencidos
                    </p>

                    <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1 md:mt-2">
                      {resumen.ticketsVencidos.toLocaleString()}
                    </p>

                    <p className="text-xs md:text-sm text-slate-400 mt-1">
                      tickets
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-red-500 to-rose-400 text-white p-3 md:p-4 rounded-xl shrink-0 shadow-lg shadow-red-500/30">
                    <TicketX
                      size={24}
                      className="md:w-[28px] md:h-[28px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm flex flex-col">
                <div className="mb-4 md:mb-6 flex items-center gap-3">
                  <div className="w-2 h-6 bg-blue-600 rounded-full" />

                  <div>
                    <h2 className="text-base md:text-lg font-bold text-slate-800">
                      Consumo por departamento
                    </h2>

                    <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                      Combustible consumido por departamento
                    </p>
                  </div>
                </div>

                <div className="h-64 sm:h-80 w-full">
                  {consumoDepartamentos.length > 0 ? (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={consumoDepartamentos}
                        margin={{
                          bottom: 30,
                          right: 10,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />

                        <XAxis
                          dataKey="nombre"
                          tick={{
                            fontSize: 12,
                            fill: '#64748b',
                          }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                        />

                        <YAxis
                          tick={{
                            fontSize: 12,
                            fill: '#64748b',
                          }}
                          axisLine={false}
                          tickLine={false}
                          width={45}
                        />

                        <Tooltip
                          formatter={(valor) => [
                            `${Number(valor).toLocaleString()} gal`,
                            'Consumo',
                          ]}
                          cursor={{
                            fill: '#f8fafc',
                          }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow:
                              '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          }}
                        />

                        <Bar
                          dataKey="galones"
                          fill="#2563eb"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center px-4">
                      <p className="text-slate-500 font-medium">
                        Sin consumo registrado
                      </p>

                      <p className="text-sm text-slate-400 mt-1">
                        La API no devolvió datos de consumo por departamento.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm flex flex-col">
                <div className="mb-4 md:mb-6 flex items-center gap-3">
                  <div className="w-2 h-6 bg-cyan-500 rounded-full" />

                  <div>
                    <h2 className="text-base md:text-lg font-bold text-slate-800">
                      Consumo por vehículo
                    </h2>

                    <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                      Combustible consumido por vehículo
                    </p>
                  </div>
                </div>

                <div className="h-64 sm:h-80 w-full">
                  {consumoVehiculos.length > 0 ? (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={consumoVehiculos}
                        margin={{
                          bottom: 10,
                          right: 10,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />

                        <XAxis
                          dataKey="nombre"
                          tick={{
                            fontSize: 12,
                            fill: '#64748b',
                          }}
                          axisLine={false}
                          tickLine={false}
                        />

                        <YAxis
                          tick={{
                            fontSize: 12,
                            fill: '#64748b',
                          }}
                          axisLine={false}
                          tickLine={false}
                          width={45}
                        />

                        <Tooltip
                          formatter={(valor) => [
                            `${Number(valor).toLocaleString()} gal`,
                            'Consumo',
                          ]}
                          cursor={{
                            fill: '#f8fafc',
                          }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow:
                              '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          }}
                        />

                        <Bar
                          dataKey="galones"
                          fill="#06b6d4"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center px-4">
                      <p className="text-slate-500 font-medium">
                        Sin consumo registrado
                      </p>

                      <p className="text-sm text-slate-400 mt-1">
                        La API no devolvió datos de consumo por vehículo.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

export default Dashboard
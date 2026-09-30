import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Ticket,
  User,
  Car,
  Fuel,
  CalendarDays,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../../App.jsx';


// Colores para identificar visualmente cada estado, alineados a los posibles estados de la API.
const coloresEstado = {
  Creado: 'bg-slate-100 text-slate-700',
  'Generado y Enviado': 'bg-blue-100 text-blue-700',
  Pendiente: 'bg-yellow-100 text-yellow-800',
  'Próximo a vencer': 'bg-orange-100 text-orange-700',
  Vencido: 'bg-red-100 text-red-700',
  Consumido: 'bg-green-100 text-green-700',
  Anulado: 'bg-gray-200 text-gray-700'
};

function ConsultaTickets() {
  const navigate = useNavigate();

  // Estados para la API
  const [tickets, setTickets] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorApi, setErrorApi] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);

  // Efecto para obtener los tickets al cargar el componente
  useEffect(() => {
    const fetchTickets = async () => {
      setCargando(true);
      setErrorApi('');
      try {
        const token = localStorage.getItem('fuelcontrol_token');
        
        const response = await fetch(`${API_BASE_URL}/tickets`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (result.success) {
          setTickets(result.data);
        } else {
          setErrorApi(result.message || 'Error al obtener la lista de tickets.');
        }
      } catch (err) {
        setErrorApi('Error de red al conectar con el servidor.');
      } finally {
        setCargando(false);
      }
    };

    fetchTickets();
  }, []);

  // Filtrar tickets según el texto introducido 
  const ticketsFiltrados = tickets.filter((ticket) => {
    const texto = busqueda.toLowerCase().trim();

    return (
      (ticket.sequentialId || '').toLowerCase().includes(texto) ||
      (ticket.employeeName || '').toLowerCase().includes(texto) ||
      (ticket.vehicleCode || '').toLowerCase().includes(texto)
    );
  });

  const formatearFecha = (fechaString) => {
    if (!fechaString) return 'N/A';
    return new Date(fechaString).toLocaleDateString('es-DO');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      
      <header className="bg-blue-700 text-white p-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            if (ticketSeleccionado) {
              setTicketSeleccionado(null);
            } else {
              navigate(-1);
            }
          }}
          className="p-1"
          aria-label="Volver"
        >
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-lg font-semibold">
          {ticketSeleccionado
            ? 'Detalle del Ticket'
            : 'Consulta de Tickets'}
        </h1>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto p-4 pb-10 space-y-5">

        
        {cargando && (
          <div className="flex flex-col items-center justify-center py-20 text-blue-600">
            <Loader2 size={40} className="animate-spin mb-4" />
            <p className="font-medium">Cargando tickets...</p>
          </div>
        )}

        
        {!cargando && errorApi && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={24} className="shrink-0" />
            <p className="text-sm">{errorApi}</p>
          </div>
        )}

        {!cargando && !errorApi && !ticketSeleccionado && (
          <>
            
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Search
                  size={22}
                  className="text-blue-700"
                />

                <h2 className="text-lg font-bold text-slate-800">
                  Buscar Ticket
                </h2>
              </div>

              <label
                htmlFor="buscar-ticket"
                className="block text-sm font-medium text-slate-700"
              >
                Número de ticket, empleado o vehículo
              </label>

              <input
                id="buscar-ticket"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej. COM-2026-000001"
                className="w-full border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </section>

           
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-800">
                  Tickets
                </h2>

                <span className="text-sm text-slate-500">
                  {ticketsFiltrados.length} resultados
                </span>
              </div>

              {ticketsFiltrados.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                  <Search
                    size={40}
                    className="text-slate-400 mx-auto mb-3"
                  />

                  <p className="font-semibold text-slate-800">
                    No se encontraron tickets
                  </p>

                  <p className="text-sm text-slate-500 mt-2">
                    Intenta realizar la búsqueda con otro número,
                    empleado o vehículo.
                  </p>
                </div>
              ) : (
                ticketsFiltrados.map((ticket) => (
                  <button
                    key={ticket.uuid} 
                    type="button"
                    onClick={() => setTicketSeleccionado(ticket)}
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-left hover:border-blue-400 transition-colors space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 text-sm break-all">
                        {ticket.sequentialId}
                      </span>

                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${coloresEstado[ticket.status] || coloresEstado['Creado']}`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-slate-700">
                        <strong>Empleado:</strong> {ticket.employeeName || 'No asignado'}
                      </p>

                      <p className="text-sm text-slate-600">
                        {ticket.fuelType || 'Combustible'} · {ticket.authorizedQuantityGal || 0} galones
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                      <span className="text-xs text-slate-500">
                        Vence: {formatearFecha(ticket.expirationDate)}
                      </span>

                      <span className="text-sm font-semibold text-blue-700">
                        Ver detalle →
                      </span>
                    </div>
                  </button>
                ))
              )}
            </section>
          </>
        )}

        
        {!cargando && !errorApi && ticketSeleccionado && (
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="bg-blue-50 rounded-full p-4">
                <Ticket
                  size={36}
                  className="text-blue-700"
                />
              </div>

              <h2 className="text-xl font-bold text-slate-800 break-all">
                {ticketSeleccionado.sequentialId}
              </h2>

              <span
                className={`text-sm font-semibold px-4 py-2 rounded-full ${coloresEstado[ticketSeleccionado.status] || coloresEstado['Creado']}`}
              >
                {ticketSeleccionado.status}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-5 space-y-5">
              <div className="flex items-start gap-3">
                <User
                  size={21}
                  className="text-slate-400 shrink-0"
                />

                <div>
                  <p className="text-xs text-slate-500">
                    Empleado
                  </p>

                  <p className="font-medium text-slate-800">
                    {ticketSeleccionado.employeeName || 'No asignado'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Car
                  size={21}
                  className="text-slate-400 shrink-0"
                />

                <div>
                  <p className="text-xs text-slate-500">
                    Vehículo
                  </p>

                  <p className="font-medium text-slate-800">
                    {ticketSeleccionado.vehicleCode || 'No asignado'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Fuel
                  size={21}
                  className="text-slate-400 shrink-0"
                />

                <div>
                  <p className="text-xs text-slate-500">
                    Tipo de combustible
                  </p>

                  <p className="font-medium text-slate-800">
                    {ticketSeleccionado.fuelType || 'No especificado'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarDays
                  size={21}
                  className="text-slate-400 shrink-0"
                />

                <div>
                  <p className="text-xs text-slate-500">
                    Fecha de vencimiento
                  </p>

                  <p className="font-medium text-slate-800">
                    {formatearFecha(ticketSeleccionado.expirationDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-700">
                Cantidad autorizada
              </p>

              <p className="text-2xl font-bold text-blue-800">
                {ticketSeleccionado.authorizedQuantityGal || 0} galones
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTicketSeleccionado(null)}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-4 rounded-xl transition-colors"
            >
              Volver a los tickets
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default ConsultaTickets;
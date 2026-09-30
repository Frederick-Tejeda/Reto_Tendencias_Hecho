import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Fuel,
  User,
  Car,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

import { API_BASE_URL } from '../../App.jsx';

function RegistroDespacho() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ticketId } = useParams(); 

  
  const ticket = location.state?.ticket;

  // Datos introducidos por el despachador
  const [galonesServidos, setGalonesServidos] = useState('');
  const [estacionId, setEstacionId] = useState(''); 
  const [observaciones, setObservaciones] = useState('');

  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [datosRespuesta, setDatosRespuesta] = useState(null);

  
  const ticketValido =
    ticket &&
    ticket.uuid === ticketId &&
    ticket.status === 'Pendiente';

  const confirmarDespacho = async (e) => {
    e.preventDefault();
    setError('');

    const cantidad = Number(galonesServidos);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setError('Introduce una cantidad válida de galones.');
      return;
    }

    if (cantidad > (ticket.authorizedQuantityGal || 0)) {
      setError(
        `La cantidad no puede superar los ${ticket.authorizedQuantityGal} galones autorizados.`
      );
      return;
    }

    if (!estacionId) {
      setError('Debes seleccionar una estación.');
      return;
    }

    setProcesando(true);

    try {
      const token = localStorage.getItem('fuelcontrol_token');
      const sesion = JSON.parse(localStorage.getItem('fuelcontrol_usuario') || '{}');
      const dispatcherId = sesion.id || 1; // Fallback si no hay ID en sesión

      
      const payload = {
        ticketUuid: ticket.uuid,
        qrPayloadHash: ticket.qrPayloadHash || "e3b0c442...", 
        dispatcherId: parseInt(dispatcherId, 10),
        stationId: parseInt(estacionId, 10),
        gallonsServed: parseFloat(cantidad.toFixed(2)),
        dispatchTimestamp: new Date().toISOString(),
        observations: observaciones
      };

      const response = await fetch(`${API_BASE_URL}/dispatch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        setDatosRespuesta(result.data);
        setConfirmado(true);
      } else {
        setError(result.message || 'Error al procesar el despacho en el servidor.');
      }
    } catch (err) {
      setError('Error de red al intentar registrar el despacho. Verifica tu conexión.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      <header className="bg-blue-700 p-4 text-white flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1"
          aria-label="Volver"
        >
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-lg font-semibold">
          Registro de Despacho
        </h1>
      </header>

      <main className="flex-1 p-4 pb-10 w-full max-w-lg mx-auto space-y-5">

        {!ticketValido ? (
          <div className="bg-white border border-red-200 rounded-2xl p-6 text-center space-y-4 mt-5 shadow-sm">
            <AlertCircle
              size={48}
              className="text-red-500 mx-auto"
            />

            <h2 className="text-lg font-bold text-slate-800">
              Ticket no disponible
            </h2>

            <p className="text-sm text-slate-600">
              No se encontró un ticket validado en estado Pendiente para este despacho.
            </p>

            <button
              type="button"
              onClick={() => navigate('/escanear')}
              className="w-full bg-blue-700 text-white py-3 rounded-xl font-semibold"
            >
              Escanear un ticket
            </button>
          </div>

        ) : confirmado ? (

          /* Confirmación de éxito real desde la API */
          <div className="bg-white border border-green-200 rounded-2xl p-6 text-center space-y-4 mt-5 shadow-sm">
            <CheckCircle
              size={64}
              className="text-green-500 mx-auto"
            />

            <h2 className="text-xl font-bold text-slate-800">
              Despacho Exitoso
            </h2>

            <p className="text-slate-600">
              Se ha registrado el consumo de <strong>{galonesServidos} galones</strong>.
            </p>

            <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg text-left space-y-1">
              <p><strong>ID Despacho:</strong> {datosRespuesta?.dispatchId}</p>
              <p><strong>Ticket:</strong> {ticket.sequentialId}</p>
              <p><strong>Estado Actual:</strong> {datosRespuesta?.ticketStatus}</p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/escanear')}
              className="w-full bg-blue-700 hover:bg-blue-800 transition-colors text-white py-4 rounded-xl font-semibold mt-4"
            >
              Escanear otro ticket
            </button>
          </div>

        ) : (
          <>
            
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Fuel size={22} className="text-blue-700" />
                <h2 className="text-lg font-bold text-slate-800">
                  Información del Ticket
                </h2>
              </div>

              <div>
                <p className="text-xs text-slate-500">Número de ticket</p>
                <p className="font-bold text-slate-800">{ticket.sequentialId}</p>
              </div>

              <div className="flex items-center gap-3">
                <User size={20} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Empleado</p>
                  <p className="font-medium text-slate-800">{ticket.employeeName || 'No asignado'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Car size={20} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Vehículo</p>
                  <p className="font-medium text-slate-800">{ticket.vehicleCode || 'No asignado'}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm text-blue-700">Cantidad autorizada</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {ticket.authorizedQuantityGal} gal
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
                    {ticket.status}
                  </span>
                  <p className="text-sm text-blue-700 mt-1">{ticket.fuelType}</p>
                </div>
              </div>
            </section>

            {/* Formulario */}
            <form
              onSubmit={confirmarDespacho}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5"
            >
              <h2 className="text-lg font-bold text-slate-800">
                Datos del Despacho
              </h2>

              <div>
                <label
                  htmlFor="galones"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Galones servidos *
                </label>

                <input
                  id="galones"
                  type="number"
                  min="0.01"
                  max={ticket.authorizedQuantityGal}
                  step="any"
                  inputMode="decimal"
                  required
                  value={galonesServidos}
                  onChange={(e) => setGalonesServidos(e.target.value)}
                  placeholder="Ej. 10.5"
                  className="w-full border border-slate-300 rounded-xl p-4 text-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="estacion"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Estación de combustible *
                </label>

          
                <select
                  id="estacion"
                  required
                  value={estacionId}
                  onChange={(e) => setEstacionId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-4 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Seleccionar estación</option>
                  <option value="1">Estación Principal INTEC</option>
                  <option value="2">Estación Secundaria</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="observaciones"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Observaciones
                </label>

                <textarea
                  id="observaciones"
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Escribe una observación si es necesario..."
                  className="w-full border border-slate-300 rounded-xl p-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 rounded-xl p-4 text-sm"
                >
                  <AlertCircle size={20} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={procesando}
                className="w-full bg-blue-700 hover:bg-blue-800 flex items-center justify-center gap-2 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-70"
              >
                {procesando ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Registrar Consumo'
                )}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

export default RegistroDespacho;
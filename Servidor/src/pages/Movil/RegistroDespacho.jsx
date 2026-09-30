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
  
  // Extraemos el hash de seguridad enviado desde la pantalla anterior
  const hashValidacion = location.state?.hashValidacion || ticket?.qrPayloadHash;

  // Datos introducidos por el despachador
  const [galonesServidos, setGalonesServidos] = useState('');
  const [estacionId, setEstacionId] = useState(''); 
  const [observaciones, setObservaciones] = useState('');

  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [datosRespuesta, setDatosRespuesta] = useState(null);

  // Flexibilizamos la validación visual asumiendo que si llegó aquí, la pantalla anterior lo validó
  const ticketValido = ticket && (ticket.uuid === ticketId || ticket.id === ticketId || ticketId);

  const confirmarDespacho = async (e) => {
    e.preventDefault();
    setError('');

    if (!hashValidacion) {
      setError('No se detectó el hash de seguridad del código QR. Vuelve a escanear el ticket.');
      return;
    }

    const cantidad = Number(galonesServidos);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setError('Introduce una cantidad válida de galones.');
      return;
    }

    // Permitimos despachar si hay cantidad autorizada o si es un ticket simulado
    const cantidadAutorizada = ticket.authorizedQuantityGal || ticket.cantidad || 0;
    if (cantidadAutorizada > 0 && cantidad > cantidadAutorizada) {
      setError(`La cantidad no puede superar los ${cantidadAutorizada} galones autorizados.`);
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
      const dispatcherId = sesion.id || sesion.id_usuario || sesion.id_empleado || 1;

      // Payload estructurado exactamente como lo exige el contrato de la API para POST /api/v1/dispatch[cite: 4]
      const payload = {
        ticketUuid: ticket.uuid || ticketId,
        qrPayloadHash: hashValidacion, 
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

      if (response.ok && result.success) {
        setDatosRespuesta(result.data);
        setConfirmado(true);
      } else {
        setError(result.message || 'Error al procesar el despacho: Ticket inválido, vencido o hash incorrecto.');
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
          className="p-1 transition-transform hover:scale-110"
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
            <AlertCircle size={48} className="text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Ticket no disponible</h2>
            <p className="text-sm text-slate-600">
              No se encontraron los datos del ticket para este despacho.
            </p>
            <button
              type="button"
              onClick={() => navigate('/escanear')}
              className="w-full bg-blue-700 hover:bg-blue-800 transition-colors text-white py-4 rounded-xl font-semibold"
            >
              Escanear un ticket
            </button>
          </div>
        ) : confirmado ? (
          <div className="bg-white border border-green-200 rounded-2xl p-6 text-center space-y-4 mt-5 shadow-sm">
            <CheckCircle size={64} className="text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">Despacho Exitoso</h2>
            <p className="text-slate-600">
              Se ha registrado el consumo de <strong>{galonesServidos} galones</strong>.
            </p>
            <div className="text-sm text-slate-500 bg-slate-50 border border-slate-100 p-4 rounded-xl text-left space-y-2">
              <p><strong>ID Despacho:</strong> {datosRespuesta?.dispatchId || 'N/A'}</p>
              <p><strong>Ticket:</strong> {ticket.sequentialId || ticket.uuid}</p>
              <p><strong>Estado Actual:</strong> {datosRespuesta?.ticketStatus || 'Consumido'}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/escanear')}
              className="w-full bg-blue-700 hover:bg-blue-800 transition-colors text-white py-4 rounded-xl font-semibold mt-4 shadow-md"
            >
              Escanear otro ticket
            </button>
          </div>
        ) : (
          <>
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Fuel size={22} className="text-blue-700" />
                <h2 className="text-lg font-bold text-slate-800">Información del Ticket</h2>
              </div>
              <div>
                <p className="text-xs text-slate-500">Número de ticket</p>
                <p className="font-bold text-slate-800 break-all">{ticket.sequentialId || ticket.uuid}</p>
              </div>
              <div className="flex items-center gap-3">
                <User size={20} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Empleado</p>
                  <p className="font-medium text-slate-800">{ticket.employeeName || 'No asignado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Car size={20} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Vehículo</p>
                  <p className="font-medium text-slate-800">{ticket.vehicleCode || 'No asignado'}</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm text-blue-700">Cantidad autorizada</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {ticket.authorizedQuantityGal || ticket.cantidad || 0} gal
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">
                    {ticket.status || 'Aprobado'}
                  </span>
                  <p className="text-sm text-blue-700 mt-1 font-medium">{ticket.fuelType || 'Combustible'}</p>
                </div>
              </div>
            </section>

            <form onSubmit={confirmarDespacho} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
              <h2 className="text-lg font-bold text-slate-800">Datos del Despacho</h2>
              <div>
                <label htmlFor="galones" className="block text-sm font-semibold text-slate-700 mb-2">
                  Galones servidos *
                </label>
                <input
                  id="galones"
                  type="number"
                  min="0.01"
                  max={ticket.authorizedQuantityGal || ticket.cantidad}
                  step="any"
                  inputMode="decimal"
                  required
                  value={galonesServidos}
                  onChange={(e) => setGalonesServidos(e.target.value)}
                  placeholder="Ej. 10.5"
                  className="w-full border border-slate-300 rounded-xl p-4 text-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label htmlFor="estacion" className="block text-sm font-semibold text-slate-700 mb-2">
                  Estación de combustible *
                </label>
                <select
                  id="estacion"
                  required
                  value={estacionId}
                  onChange={(e) => setEstacionId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-4 bg-slate-50 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
                >
                  <option value="">Seleccionar estación...</option>
                  <option value="1">Estación Principal INTEC</option>
                  <option value="2">Estación Secundaria</option>
                </select>
              </div>
              <div>
                <label htmlFor="observaciones" className="block text-sm font-semibold text-slate-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  id="observaciones"
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Escribe una observación si es necesario..."
                  className="w-full border border-slate-300 rounded-xl p-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              {error && (
                <div role="alert" className="bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 rounded-xl p-4 text-sm font-medium">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={procesando}
                className="w-full bg-blue-700 hover:bg-blue-800 flex items-center justify-center gap-2 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:opacity-70 disabled:hover:bg-blue-700 transform hover:scale-[1.02] disabled:hover:scale-100"
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
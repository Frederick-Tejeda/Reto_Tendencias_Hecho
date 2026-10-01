import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Fuel, User, Car, ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../App.jsx';

function ValidacionTicket() {
  const navigate = useNavigate();
  const { qrData } = useParams(); 
  const location = useLocation();
  const parametros = new URLSearchParams(location.search);
  const token = parametros.get('token') || parametros.get('ticketUuid');
  const qrhash = parametros.get('qrhash') || parametros.get('qrPayloadHash');
  
  const [ticket, setTicket] = useState(location.state?.ticket || null);
  const [cargando, setCargando] = useState(!location.state?.ticket);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ticket) return;

    const validarTicket = async () => {
      try {
        const tokenStr = localStorage.getItem('fuelcontrol_token');
        const hashDesdeState = location.state?.hash || '';

        // APLICANDO TU ESTRUCTURA DE URL EXACTA CON VARIABLES NUEVAS Y DOBLE (?)
        const urlValidacion = `${API_BASE_URL}/dispatch/validate?ticketUuid=${token}&qrPayloadHash=${qrhash}`;

        const response = await fetch(urlValidacion, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenStr}`,
            'Content-Type': 'application/json'
          }
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("El servidor no devolvió JSON.");
        }

        const result = await response.json();

        if (response.ok && result.success) {
          setTicket(result.data);
        } else {
          setError(result.message || 'Error del servidor: Posiblemente falta token/hash.');
        }
      } catch (err) {
        console.error('Error de red:', err);
        setError(`Error al validar: ${err.message}`);
      } finally {
        setCargando(false);
      }
    };

    validarTicket();
  }, [qrData, ticket, location.state]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium animate-pulse">Validando código seguro...</p>
      </div>
    );
  }

  const esValido = ticket?.status === 'Enviado';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className={`p-4 text-white flex items-center gap-4 ${esValido && !error ? 'bg-blue-700' : 'bg-red-600'}`}>
        <button onClick={() => navigate('/escanear')} className="p-1">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-semibold">Validación de Ticket</h2>
      </header>

      <main className="flex-1 p-6 pb-20 flex flex-col items-center">
        {error ? (
           <div className="flex flex-col items-center text-red-500 my-8 text-center">
             <AlertCircle size={64} className="mb-4" />
             <h3 className="text-xl font-bold mb-2">Error de Validación</h3>
             <p className="font-medium text-slate-600">{error}</p>
             <button onClick={() => navigate('/escanear')} className="w-full mt-8 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-4 rounded-xl transition-all">
                Escanear otro código
              </button>
           </div>
        ) : (
          <>
            {esValido ? <CheckCircle size={64} className="text-green-500 mb-4" /> : <XCircle size={64} className="text-red-500 mb-4" />}
            <h3 className="text-2xl font-bold text-slate-800 mb-1">{ticket?.ticketUuid || 'Desconocido'}</h3>
            <span className={`text-sm font-bold px-3 py-1 rounded-full uppercase mb-6 ${esValido ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {esValido ? 'Valido' : 'Inválido'}
            </span>

            <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4 mb-8">
              <div className="flex gap-4 items-center text-slate-700">
                <div className="bg-slate-100 p-2 rounded-lg"><User size={20} className="text-slate-500" /></div>
                <div>
                  <p className="text-xs text-slate-400">Empleado</p>
                  <p className="font-medium">{ticket?.employee.name || 'No especificado'}</p>
                </div>
              </div>
              <div className="flex gap-4 items-center text-slate-700">
                <div className="bg-slate-100 p-2 rounded-lg"><Car size={20} className="text-slate-500" /></div>
                <div>
                  <p className="text-xs text-slate-400">Vehículo</p>
                  <p className="font-medium">{ticket?.vehicle.internalCode || 'No especificado'}</p>
                </div>
              </div>
              <div className="flex gap-4 items-center text-slate-700">
                <div className="bg-blue-50 p-2 rounded-lg"><Fuel size={20} className="text-blue-600" /></div>
                <div>
                  <p className="text-xs text-slate-400">Autorizado</p>
                  <p className="font-bold text-blue-700">{ticket?.dispatchDetails.authorizedQuantityGal || 0} Galones ({ticket?.dispatchDetails.fuelType || 'N/A'})</p>
                </div>
              </div>
            </div>

            {esValido ? (
              <button onClick={() => navigate(`/despacho/registrar/${ticket.ticketUuid}`, { state: { ticket } })} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all">
                Proceder al Despacho
              </button>
            ) : (
              <button onClick={() => navigate('/escanear')} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-4 rounded-xl transition-all">
                Escanear otro código
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default ValidacionTicket;
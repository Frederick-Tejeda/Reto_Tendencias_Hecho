import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../App'; 

function EscaneoQR() {
  const navigate = useNavigate();
  const [errorLectura, setErrorLectura] = useState('');
  const [verificando, setVerificando] = useState(false);
  
  // Referencias para controlar el flujo sin depender de re-renders de React
  const procesandoRef = useRef(false);
  const scannerRef = useRef(null);

  const procesarQR = async (textoDecodificado) => {
    // Evitamos peticiones simultáneas si ya estamos verificando un código
    if (procesandoRef.current) return;
    
    procesandoRef.current = true;
    setVerificando(true);
    setErrorLectura('');

    try {
      // 1. Extraemos el UUID y el Hash. Soporta QR en texto plano o formato JSON[cite: 7]
      let ticketUuid = textoDecodificado;
      let qrPayloadHash = '';
      
      try {
        const datosQR = JSON.parse(textoDecodificado);
        ticketUuid = datosQR.uuid || datosQR.ticketUuid || textoDecodificado;
        qrPayloadHash = datosQR.hash || datosQR.qrPayloadHash || '';
      } catch (e) {
        // Si falla el parseo, asumimos que el QR contiene únicamente el UUID en texto plano
      }

      // 2. Consultamos la API para validar la existencia del ticket[cite: 7]
      const token = localStorage.getItem('fuelcontrol_token');
      const response = await fetch(`${API_BASE_URL}/tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        // Buscamos si el UUID escaneado existe en la base de datos[cite: 7]
        const ticketEncontrado = result.data.find(t => t.uuid === ticketUuid);

        if (ticketEncontrado) {
          // Si existe, detenemos el escáner de forma segura
          if (scannerRef.current && scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          
          // Adjuntamos el hash de validación si el QR lo contenía, requerido para el Despacho[cite: 7]
          if (qrPayloadHash) ticketEncontrado.qrPayloadHash = qrPayloadHash;

          // Navegamos pasando el objeto completo para evitar una segunda consulta a la API
          navigate(`/despacho/validar/${ticketUuid}`, { state: { ticket: ticketEncontrado } });
          return; 
        } else {
          setErrorLectura('El código QR no corresponde a un ticket registrado o válido.');
        }
      } else {
        setErrorLectura('Error al consultar el servidor. Intente nuevamente.');
      }
    } catch (error) {
      console.error('Error verificando ticket:', error);
      setErrorLectura('Error de red al validar el código QR.');
    }

    // 3. Si el ticket no es válido, reiniciamos el estado tras 3 segundos para seguir escaneando
    setTimeout(() => {
      setErrorLectura('');
      setVerificando(false);
      procesandoRef.current = false;
    }, 3000);
  };

  useEffect(() => {
    let isMounted = true;
    scannerRef.current = new Html5Qrcode('lector-qr');

    const startPromise = scannerRef.current.start(
      { facingMode: 'environment' }, 
      {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdgePercentage = 0.7;
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return { width: qrboxSize, height: qrboxSize };
        }
      },
      (textoDecodificado) => {
        // Ejecutamos la validación contra la API al detectar un código
        procesarQR(textoDecodificado);
      },
      (errorMensaje) => {
        // Ignoramos errores de lectura de frames vacíos
      }
    );

    startPromise.catch((err) => {
      if (isMounted) {
        console.error('Error al iniciar la cámara:', err);
        setErrorLectura('No se pudo iniciar la cámara. Verifique los permisos de su navegador.');
      }
    });

    return () => {
      isMounted = false;
      startPromise
        .then(() => scannerRef.current.stop())
        .then(() => scannerRef.current.clear())
        .catch(() => {
          const contenedor = document.getElementById('lector-qr');
          if (contenedor) contenedor.innerHTML = '';
        });
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="p-4 flex items-center gap-4 bg-slate-800 border-b border-slate-700">
        <button 
          onClick={() => navigate('/dashboard')} 
          disabled={verificando}
          className="p-2 text-slate-300 hover:text-white disabled:opacity-50"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-lg font-semibold">Escanear Ticket</h2>
          <p className="text-xs text-slate-400">Estación de Combustible</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24 relative">
        
        {/* Overlay de carga que bloquea la vista mientras se consulta la API */}
        {verificando && !errorLectura && (
          <div className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
            <p className="text-white font-medium text-lg">Validando ticket...</p>
            <p className="text-slate-400 text-sm mt-2">Conectando con el servidor</p>
          </div>
        )}

        <div className="w-full max-w-sm bg-black rounded-2xl overflow-hidden shadow-2xl mb-6 flex items-center justify-center relative min-h-[250px]">
          <div id="lector-qr" className="w-full"></div>
          
          {!errorLectura && !verificando && (
            <p className="text-slate-400 text-sm animate-pulse absolute z-[-1]">
              Iniciando cámara...
            </p>
          )}
        </div>

        {errorLectura ? (
          <div className="flex items-center gap-3 text-red-400 bg-red-400/10 px-4 py-4 rounded-xl w-full max-w-sm border border-red-500/20">
            <AlertCircle size={24} className="shrink-0" />
            <p className="text-sm leading-relaxed">{errorLectura}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-slate-400 text-center gap-3">
            <QrCode size={48} className="text-blue-500 opacity-50" />
            <p className="text-sm px-4">
              Apunta la cámara al código QR del empleado para validar el ticket digital.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default EscaneoQR;
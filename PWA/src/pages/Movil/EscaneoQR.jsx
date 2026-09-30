import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../App'; 

function EscaneoQR() {
  const navigate = useNavigate();
  const [errorLectura, setErrorLectura] = useState('');
  const [verificando, setVerificando] = useState(false);
  
  const procesandoRef = useRef(false);
  const scannerRef = useRef(null);

  const procesarQR = async (textoDecodificado) => {
    if (procesandoRef.current) return;
    
    procesandoRef.current = true;
    setVerificando(true);
    setErrorLectura('');

    try {
      let ticketUuid = '';
      let qrPayloadHash = '';
      
      // Adaptado para detectar tanto los nombres antiguos (token/qrhash) como los nuevos (ticketUuid/qrPayloadHash) en el texto del QR
      if (textoDecodificado.includes('token=') || textoDecodificado.includes('ticketUuid=')) {
        const tokenMatch = textoDecodificado.match(/(?:ticketUuid|token)=([^?&]+)/);
        if (tokenMatch) ticketUuid = tokenMatch[1];
        
        const hashMatch = textoDecodificado.match(/(?:qrPayloadHash|qrhash|hash)=([^?&]+)/);
        if (hashMatch) qrPayloadHash = hashMatch[1];
      } else if (textoDecodificado.trim().startsWith('{')) {
        try {
          const datosQR = JSON.parse(textoDecodificado);
          ticketUuid = datosQR.uuid || datosQR.ticketUuid || datosQR.token || '';
          qrPayloadHash = datosQR.hash || datosQR.qrPayloadHash || datosQR.qrhash || datosQR.qr_hash || '';
        } catch (e) {}
      } 
      
      if (!ticketUuid) {
        ticketUuid = textoDecodificado;
      }

      if (!ticketUuid || !qrPayloadHash) {
        throw new Error(`Faltan datos en el QR.\nLeído: "${textoDecodificado}"`);
      }

      const tokenStr = localStorage.getItem('fuelcontrol_token');
      
      // APLICANDO TU ESTRUCTURA DE URL EXACTA CON VARIABLES NUEVAS Y DOBLE (?)
      const urlValidacion = `${API_BASE_URL}/dispatch/validate?ticketUuid=${ticketUuid}&qrPayloadHash=${qrPayloadHash}`;

      const response = await fetch(urlValidacion, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenStr}`,
          'Content-Type': 'application/json'
        }
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError("Error del servidor (No es JSON). Verifica la ruta de la API.");
      }

      const result = await response.json();

      if (response.ok && result.success) {
        if (scannerRef.current && scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        
        const ticketEncontrado = result.data;
        if (qrPayloadHash) ticketEncontrado.qrPayloadHash = qrPayloadHash;

        navigate(`/despacho/validar/${ticketUuid}`, { state: { ticket: ticketEncontrado, hash: qrPayloadHash } });
        return; 
      } else {
        setErrorLectura(result.message || 'El servidor rechazó el ticket.');
      }
    } catch (error) {
      console.error('Error verificando ticket:', error);
      setErrorLectura(error.message);
    }

    setTimeout(() => {
      setErrorLectura('');
      setVerificando(false);
      procesandoRef.current = false;
    }, 5000); 
  };

  useEffect(() => {
    let isMounted = true;
    scannerRef.current = new Html5Qrcode('lector-qr');

    const startPromise = scannerRef.current.start(
      { facingMode: 'environment' }, 
      {
        fps: 10,
        // CONFIGURACIÓN ORIGINAL PARA QUE LA CÁMARA SE VEA BIEN EN MÓVIL
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdgePercentage = 0.7;
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return { width: qrboxSize, height: qrboxSize };
        }
      },
      (textoDecodificado) => {
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
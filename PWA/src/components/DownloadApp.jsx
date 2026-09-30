import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function InstalarPWA() {
  const [promptInstalacion, setPromptInstalacion] = useState(null)
  const [oculto, setOculto] = useState(false)

  useEffect(() => {
    const manejarInstalacion = (e) => {
      e.preventDefault()
      setPromptInstalacion(e)
    }
    
    window.addEventListener('beforeinstallprompt', manejarInstalacion)
    
    return () => window.removeEventListener('beforeinstallprompt', manejarInstalacion)
  }, [])

  const instalarApp = async () => {
    
    if (!promptInstalacion) {
      alert("MODO PRUEBA: El diseño del botón funciona correctamente. \n\nPara que la instalación real funcione, debes entrar desde 'localhost' o subir la app a un servidor con HTTPS.");
      return;
    }
    
    promptInstalacion.prompt()
    
    const { outcome } = await promptInstalacion.userChoice
    if (outcome === 'accepted') {
      setPromptInstalacion(null)
    }
  }

  
  if (oculto) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center bg-white p-2 rounded-2xl shadow-2xl border border-slate-200 transition-all transform hover:-translate-y-1">
      <button
        onClick={instalarApp}
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:from-blue-700 hover:to-cyan-600 transition-all"
      >
        <Download size={18} />
        Instalar FuelPass
      </button>

      <button 
        onClick={() => setOculto(true)}
        className="ml-2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        title="Ocultar aviso"
      >
        <X size={20} />
      </button>
    </div>
  )
}
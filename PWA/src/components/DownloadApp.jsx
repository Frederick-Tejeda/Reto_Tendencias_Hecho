import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

export default function InstalarPWA() {
  const [promptInstalacion, setPromptInstalacion] = useState(null)
  const [oculto, setOculto] = useState(false)
  const [esIOS, setEsIOS] = useState(false)

  useEffect(() => {
    // 1. Detectar si el usuario está en un iPhone/iPad
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setEsIOS(isIosDevice)

    // 2. Capturar el evento para Android/Desktop
    const manejarInstalacion = (e) => {
      e.preventDefault()
      setPromptInstalacion(e)
    }
    
    window.addEventListener('beforeinstallprompt', manejarInstalacion)
    return () => window.removeEventListener('beforeinstallprompt', manejarInstalacion)
  }, [])

  const instalarApp = async () => {
    if (!promptInstalacion) return
    promptInstalacion.prompt()
    const { outcome } = await promptInstalacion.userChoice
    if (outcome === 'accepted') {
      setPromptInstalacion(null)
    }
  }

  if (oculto) return null

  
  if (!promptInstalacion && !esIOS) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col md:flex-row items-end md:items-center bg-white p-3 md:p-2 rounded-2xl shadow-2xl border border-slate-200 transition-all transform hover:-translate-y-1 max-w-sm">
      
      
      {promptInstalacion && (
        <div className="flex items-center">
          <button
            onClick={instalarApp}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:from-blue-700 hover:to-cyan-600 transition-all"
          >
            <Download size={18} />
            Instalar FuelPass
          </button>
        </div>
      )}

      {esIOS && !promptInstalacion && (
        <div className="flex items-center gap-3 px-2 py-1 text-sm text-slate-700">
          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
            <Share size={18} />
          </div>
          <p className="font-medium">
            Para instalar: Toca <strong>Compartir</strong> y luego <strong>"Agregar a inicio"</strong>
          </p>
        </div>
      )}

      <button 
        onClick={() => setOculto(true)}
        className="absolute -top-2 -right-2 md:static md:-top-0 md:-right-0 ml-2 p-1.5 bg-white md:bg-transparent border md:border-none border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shadow-sm md:shadow-none"
        title="Ocultar aviso"
      >
        <X size={18} />
      </button>
    </div>
  )
}
import { useEffect, useState, useRef } from 'react'
import { ShieldAlert, ShieldCheck, Activity, RefreshCw, AlertTriangle, Play, Square } from 'lucide-react'

interface AlertData {
  timestamp: string;
  severity: string;
  alert_type: string;
  description: string;
  source_ip: string;
}

export default function ThreatDetection() {
  const [liveAlerts, setLiveAlerts] = useState<AlertData[]>([])
  const [history, setHistory] = useState<AlertData[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

    useEffect(() => {
    fetchAlerts()
    fetchCaptureStatus()
    
    console.log("Connecting to Threats WebSocket...");
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/threats')
    wsRef.current = ws

    ws.onopen = () => console.log("✅ Threats WebSocket Connected")
    ws.onerror = (e) => console.error("❌ Threats WebSocket Error:", e)
    
    ws.onmessage = (event) => {
      console.log("📥 Received threat data:", event.data)
      const alert: AlertData = JSON.parse(event.data)
      setLiveAlerts(prev => [alert, ...prev].slice(0, 20))
    }

    return () => ws.close()
  }, [])

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/threats/history?limit=20')
      const data = await res.json()
      setHistory(data.alerts)
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    }
  }

  const fetchCaptureStatus = async () => {
    try {
      // We can use the capture status endpoint to know if the engine is running
      const res = await fetch('http://127.0.0.1:8000/api/capture/status')
      const data = await res.json()
      setIsCapturing(data.is_capturing)
    } catch (err) {
      console.error('Failed to fetch capture status:', err)
    }
  }

  const toggleMonitoring = async () => {
    const endpoint = isCapturing ? 'stop' : 'start'
    try {
      await fetch(`http://127.0.0.1:8000/api/capture/${endpoint}`, { method: 'POST' })
      setIsCapturing(!isCapturing)
      if (!isCapturing) fetchAlerts()
    } catch (err) {
      console.error('Failed to toggle monitoring:', err)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500/10 text-red-400 border-red-500/30'
      case 'High': return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
      case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    }
  }

   const renderDescription = (desc: string) => {
    const parts = desc.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) => 
      part.match(/(https?:\/\/[^\s]+)/g) ? 
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{part}</a> : 
        <span key={i}>{part}</span>
    );
  }

  const AlertCard = ({ alert }: { alert: AlertData }) => (
    <div className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} bg-black/20`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-bold text-white">{alert.alert_type}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getSeverityColor(alert.severity)}`}>
          {alert.severity}
        </span>
      </div>
      <p className="text-xs text-zinc-300 mb-2">
        {renderDescription(alert.description)}
      </p>
      <div className="text-xs text-zinc-500 font-mono flex justify-between">
        <span>Source: {alert.source_ip}</span>
        <span>{alert.timestamp}</span>
      </div>
    </div>
  )

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Threat Detection</h1>
          <p className="text-sm text-zinc-500">Real-time network security monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchAlerts}
            className="p-2 rounded-lg bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 border border-zinc-500/20"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMonitoring}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isCapturing 
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
            }`}
          >
            {isCapturing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isCapturing ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Live Alerts */}
        <div className="glass-card p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <Activity className={`w-4 h-4 ${isCapturing ? 'text-red-400 animate-pulse' : 'text-zinc-500'}`} />
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Live Threat Feed</h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {liveAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-20">
                <ShieldCheck className="w-12 h-12 mb-4 text-green-500/20" />
                <p className="text-sm text-center">
                  {isCapturing ? "No active threats detected. System is secure." : "Monitoring is paused."}
                </p>
              </div>
            ) : (
              liveAlerts.map((alert, i) => <AlertCard key={i} alert={alert} />)
            )}
          </div>
        </div>

        {/* Historical Alerts */}
        <div className="glass-card p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Alert History</h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-20">
                <p className="text-sm">No historical alerts.</p>
              </div>
            ) : (
              history.map((alert, i) => <AlertCard key={i} alert={alert} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
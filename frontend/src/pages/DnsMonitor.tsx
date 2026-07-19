import { useEffect, useState } from 'react'
import { Globe, ShieldAlert, Play, Square, RefreshCw, AlertTriangle } from 'lucide-react'

interface DnsLog {
  timestamp: string;
  source_ip: string;
  domain: string;
  is_suspicious: boolean;
}

interface TopDomain {
  domain: string;
  count: number;
}

export default function DnsMonitor() {
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<DnsLog[]>([])
  const [topDomains, setTopDomains] = useState<TopDomain[]>([])

  const fetchStatus = async () => {
    const res = await fetch('http://127.0.0.1:8000/api/dns/status')
    const data = await res.json()
    setIsRunning(data.is_running)
  }

  const fetchLogs = async () => {
    const res = await fetch('http://127.0.0.1:8000/api/dns/logs?limit=50')
    const data = await res.json()
    setLogs(data.logs)
    
    const statsRes = await fetch('http://127.0.0.1:8000/api/dns/stats')
    const statsData = await statsRes.json()
    setTopDomains(statsData.top_domains)
  }

  useEffect(() => {
    fetchStatus()
    fetchLogs()
    
    // Poll for new logs every 3 seconds if running
    const interval = setInterval(() => {
      if (isRunning) fetchLogs()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [isRunning])

  const toggleMonitor = async () => {
    const endpoint = isRunning ? 'stop' : 'start'
    await fetch(`http://127.0.0.1:8000/api/dns/${endpoint}`, { method: 'POST' })
    setIsRunning(!isRunning)
    if (!isRunning) fetchLogs() // Fetch immediately on start
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">DNS Monitor</h1>
          <p className="text-sm text-zinc-500">Track queried domains and detect suspicious traffic</p>
        </div>
        <button
          onClick={toggleMonitor}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isRunning 
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
          }`}
        >
          {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isRunning ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Top Domains List */}
        <div className="glass-card p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Top Domains</h3>
          </div>
          <div className="space-y-2">
            {topDomains.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-4">No data yet.</p>
            ) : (
              topDomains.map((d, i) => (
                <div key={i} className="p-2 rounded-lg hover:bg-white/5 flex justify-between items-center text-sm">
                  <span className="text-zinc-300 truncate font-mono">{d.domain}</span>
                  <span className="text-xs text-blue-400 font-bold ml-2">{d.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent DNS Logs Table */}
        <div className="glass-card p-4 lg:col-span-2 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Live DNS Queries</h3>
            <button onClick={fetchLogs} className="text-zinc-500 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-20">
                <Globe className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">{isRunning ? "Waiting for DNS queries..." : "Click Start to begin monitoring"}</p>
              </div>
            ) : (
              logs.map((log, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-lg flex items-center justify-between border ${
                    log.is_suspicious 
                      ? 'bg-red-500/5 border-red-500/20' 
                      : 'bg-black/20 border-nexus_border/50'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {log.is_suspicious ? (
                      <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <Globe className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    )}
                    <div className="overflow-hidden">
                      <div className={`text-sm font-mono truncate ${log.is_suspicious ? 'text-red-300' : 'text-zinc-300'}`}>
                        {log.domain}
                      </div>
                      <div className="text-xs text-zinc-500">
                        From: {log.source_ip} at {log.timestamp}
                      </div>
                    </div>
                  </div>
                  {log.is_suspicious && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-400 flex items-center gap-1 flex-shrink-0 ml-2">
                      <AlertTriangle className="w-3 h-3" /> Suspicious
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
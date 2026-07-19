import { useState, useEffect } from 'react'
import { ScrollText, Search, Trash2, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'

interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/logs?level=${filter}&search=${search}`)
      const data = await res.json()
      setLogs(data.logs)
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchLogs()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, filter])

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to delete all system logs?')) return
    try {
      await fetch('http://127.0.0.1:8000/api/logs', { method: 'DELETE' })
      fetchLogs()
    } catch (err) {
      console.error('Failed to clear logs:', err)
    }
  }

  const getLevelConfig = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle }
      case 'WARNING':
        return { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertTriangle }
      case 'SUCCESS':
        return { color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle }
      default:
        return { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Info }
    }
  }

  const filters = ['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR']

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Logs</h1>
          <p className="text-sm text-zinc-500">Centralized audit trail and event viewer</p>
        </div>
        <button
          onClick={clearLogs}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Clear All Logs
        </button>
      </header>

      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-nexus_border flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search logs by message or source..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-nexus_border rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-1 bg-black/20 border border-nexus_border rounded-lg p-1">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filter === f ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Log Table */}
        <div className="flex-1 overflow-y-auto font-mono text-xs">
          {logs.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-20">
              <ScrollText className="w-12 h-12 mb-4 opacity-20" />
              <p>No logs found.</p>
            </div>
          ) : (
            <div className="divide-y divide-nexus_border/30">
              {logs.map((log, i) => {
                const config = getLevelConfig(log.level)
                const Icon = config.icon
                return (
                  <div key={i} className="flex items-start gap-4 p-3 hover:bg-white/5 transition-colors">
                    <div className="text-zinc-500 whitespace-nowrap w-44">{log.timestamp}</div>
                    <div className={`px-2 py-0.5 rounded border ${config.color} flex items-center gap-1 w-28 justify-center flex-shrink-0`}>
                      <Icon className="w-3 h-3" />
                      {log.level}
                    </div>
                    <div className="text-blue-400 w-32 truncate flex-shrink-0">[{log.source}]</div>
                    <div className="text-zinc-300 flex-1 break-all">{log.message}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
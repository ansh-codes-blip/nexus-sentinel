import { useEffect, useState, useRef } from 'react'
import { Play, Square, Search, Network } from 'lucide-react'

interface Packet {
  time: string;
  src: string;
  dst: string;
  proto: string;
  length: number;
  info: string;
}

export default function LiveCapture() {
  const [packets, setPackets] = useState<Packet[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [filter, setFilter] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Setup WebSocket
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/capture')
    wsRef.current = ws

    ws.onmessage = (event) => {
      const pkt: Packet = JSON.parse(event.data)
      // Keep only the last 100 packets to prevent browser lag
      setPackets(prev => [pkt, ...prev].slice(0, 100))
    }

    return () => {
      ws.close()
    }
  }, [])

  const toggleCapture = async () => {
    if (isCapturing) {
      await fetch('http://127.0.0.1:8000/api/capture/stop', { method: 'POST' })
      setIsCapturing(false)
    } else {
      setPackets([]) // Clear on start
      await fetch('http://127.0.0.1:8000/api/capture/start', { method: 'POST' })
      setIsCapturing(true)
    }
  }

  const getProtoColor = (proto: string) => {
    switch (proto) {
      case 'TCP': return 'text-blue-400 bg-blue-500/10'
      case 'UDP': return 'text-green-400 bg-green-500/10'
      case 'DNS': return 'text-purple-400 bg-purple-500/10'
      case 'HTTP': return 'text-amber-400 bg-amber-500/10'
      case 'ARP': return 'text-pink-400 bg-pink-500/10'
      default: return 'text-zinc-400 bg-zinc-500/10'
    }
  }

  const filteredPackets = packets.filter(p => 
    p.src.includes(filter) || 
    p.dst.includes(filter) || 
    p.proto.toLowerCase().includes(filter.toLowerCase()) ||
    p.info.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="p-8 flex flex-col h-full">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Packet Capture</h1>
          <p className="text-sm text-zinc-500">Monitor network traffic in real-time</p>
        </div>
        <button
          onClick={toggleCapture}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isCapturing 
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
          }`}
        >
          {isCapturing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isCapturing ? 'Stop Capture' : 'Start Capture'}
        </button>
      </header>

      <div className="glass-card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter by IP, protocol, or info..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-black/20 border border-nexus_border rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-nexus_border text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <div className="col-span-2">Time</div>
          <div className="col-span-2">Source</div>
          <div className="col-span-2">Destination</div>
          <div className="col-span-1">Protocol</div>
          <div className="col-span-1">Length</div>
          <div className="col-span-4">Info</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto">
          {filteredPackets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-20">
              <Network className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">
                {isCapturing ? "Waiting for packets..." : "Press Start to begin capturing"}
              </p>
            </div>
          ) : (
            filteredPackets.map((pkt, i) => (
              <div 
                key={i} 
                className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-nexus_border/50 text-xs hover:bg-white/5 transition-colors font-mono"
              >
                <div className="col-span-2 text-zinc-500">{pkt.time}</div>
                <div className="col-span-2 text-zinc-300">{pkt.src}</div>
                <div className="col-span-2 text-zinc-300">{pkt.dst}</div>
                <div className="col-span-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getProtoColor(pkt.proto)}`}>
                    {pkt.proto}
                  </span>
                </div>
                <div className="col-span-1 text-zinc-400">{pkt.length}</div>
                <div className="col-span-4 text-zinc-400 truncate">{pkt.info}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
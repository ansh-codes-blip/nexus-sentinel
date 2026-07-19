import { useEffect, useState, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Activity, ArrowUp, ArrowDown, Gauge } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function Bandwidth() {
  const [uploadSpeed, setUploadSpeed] = useState(0) // Stored as KB/s
  const [downloadSpeed, setDownloadSpeed] = useState(0) // Stored as KB/s
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  
  const chartRef = useRef<any>(null)
  const [chartData, setChartData] = useState({
    labels: Array(15).fill(''),
    datasets: [
      {
        label: 'Download (Mbps)',
        data: Array(15).fill(0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Upload (Mbps)',
        data: Array(15).fill(0),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  })

  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/metrics')
    
    ws.onopen = () => setWsStatus('connected')
    ws.onerror = () => setWsStatus('error')
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setUploadSpeed(data.upload_speed)
      setDownloadSpeed(data.download_speed)

      // Update Chart Data (Convert KB/s to Mbps for the chart)
      setChartData(prev => {
        const newLabels = [...prev.labels.slice(1), new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })]
        
        // 1 Byte = 8 bits. 1 KB = 1024 Bytes. 1 Mbps = 10^6 bits/sec.
        // Therefore: Mbps = (KB/s * 1024 * 8) / 1,000,000 = KB/s / 122.07
        // Simpler approximation: Mbps = KB/s / 125
        const newDownload = [...prev.datasets[0].data.slice(1), (data.download_speed / 125).toFixed(2)]
        const newUpload = [...prev.datasets[1].data.slice(1), (data.upload_speed / 125).toFixed(2)]
        
        return {
          labels: newLabels,
          datasets: [
            { ...prev.datasets[0], data: newDownload },
            { ...prev.datasets[1], data: newUpload }
          ]
        }
      })
    }

    return () => ws.close()
  }, [])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { color: '#a1a1aa' }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#71717a', callback: (value: any) => `${value} Mbps` }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#71717a', maxTicksLimit: 5 }
      }
    }
  }

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bandwidth Monitor</h1>
          <p className="text-sm text-zinc-500">Real-time network throughput analytics</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`}></span>
          <span className="text-xs text-zinc-400 font-medium">{wsStatus === 'connected' ? 'Live Streaming' : 'Connecting...'}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400 font-medium mb-1">Download Speed</div>
            <div className="text-3xl font-bold text-blue-400">{(downloadSpeed / 125).toFixed(2)}</div>
            <div className="text-xs text-zinc-500 mt-1">Mbps ({downloadSpeed.toFixed(1)} KB/s)</div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10">
            <ArrowDown className="w-6 h-6 text-blue-400" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400 font-medium mb-1">Upload Speed</div>
            <div className="text-3xl font-bold text-purple-400">{(uploadSpeed / 125).toFixed(2)}</div>
            <div className="text-xs text-zinc-500 mt-1">Mbps ({uploadSpeed.toFixed(1)} KB/s)</div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10">
            <ArrowUp className="w-6 h-6 text-purple-400" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400 font-medium mb-1">Total Throughput</div>
            <div className="text-3xl font-bold text-green-400">{((uploadSpeed + downloadSpeed) / 125).toFixed(2)}</div>
            <div className="text-xs text-zinc-500 mt-1">Mbps</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10">
            <Gauge className="w-6 h-6 text-green-400" />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-medium text-zinc-400">Traffic History (Last 30 Seconds)</h3>
        </div>
        <div className="h-96">
          <Line ref={chartRef} data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  )
}
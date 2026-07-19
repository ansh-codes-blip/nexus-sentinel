import { useEffect, useState } from 'react'
import { Cpu, MemoryStick, HardDrive, AlertTriangle, ShieldCheck, Activity, ShieldAlert } from 'lucide-react'
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

interface Metrics {
  cpu_usage: number;
  ram_usage: number;
  disk_usage: number;
  upload_speed: number;
  download_speed: number;
}

interface AlertData {
  timestamp: string;
  severity: string;
  alert_type: string;
  description: string;
  source_ip: string;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [recentAlerts, setRecentAlerts] = useState<AlertData[]>([])
  
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
    // Fetch recent alerts for the dashboard widget
    fetch('http://127.0.0.1:8000/api/threats/history?limit=5')
      .then(res => res.json())
      .then(data => setRecentAlerts(data.alerts))
      .catch(err => console.error("Failed to fetch alerts for dashboard:", err))

    const ws = new WebSocket('ws://127.0.0.1:8000/ws/metrics')
    
    ws.onopen = () => setWsStatus('connected')
    ws.onerror = () => setWsStatus('error')
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setMetrics(data)

      setChartData(prev => {
        const newLabels = [...prev.labels.slice(1), new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })]
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-400 bg-red-500/10'
      case 'High': return 'text-orange-400 bg-orange-500/10'
      case 'Medium': return 'text-amber-400 bg-amber-500/10'
      default: return 'text-blue-400 bg-blue-500/10'
    }
  }

  return (
    <div className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500">Real-time system and network overview</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs text-green-400 font-medium">
            {wsStatus === 'connected' ? 'Live Data' : 'Connecting...'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="CPU Usage" 
          value={metrics?.cpu_usage ?? 0} 
          icon={Cpu} 
          color="blue" 
        />
        <MetricCard 
          title="Memory" 
          value={metrics?.ram_usage ?? 0} 
          icon={MemoryStick} 
          color="purple" 
        />
        <MetricCard 
          title="Disk Space" 
          value={metrics?.disk_usage ?? 0} 
          icon={HardDrive} 
          color="amber" 
        />
        <MetricCard 
          title="Threat Level" 
          value={0} 
          icon={ShieldCheck} 
          color="green"
          isStatic={true}
          staticText="SECURE"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bandwidth Chart */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Bandwidth Traffic</h3>
            <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
          </div>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Recent Alerts (FIXED) */}
        <div className="glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Recent Alerts</h3>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-8">
                <ShieldCheck className="w-8 h-8 mb-2 text-green-500/20" />
                <p className="text-xs text-center">No active alerts. System is nominal.</p>
              </div>
            ) : (
              recentAlerts.map((alert, i) => (
                <div key={i} className="p-2 rounded-lg bg-black/20 border border-nexus_border/50 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="text-zinc-500">{alert.timestamp}</span>
                  </div>
                  <div className="text-zinc-300 font-medium">{alert.alert_type}</div>
                  <div className="text-zinc-500 mt-0.5 truncate">From: {alert.source_ip}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Reusable Metric Card Component
interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'amber' | 'green';
  isStatic?: boolean;
  staticText?: string;
}

function MetricCard({ title, value, icon: Icon, color, isStatic, staticText }: MetricCardProps) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    green: 'text-green-400 bg-green-500/10',
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-zinc-400 font-medium">{title}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-bold text-white">
        {isStatic ? staticText : `${value.toFixed(1)}%`}
      </div>
      {!isStatic && (
        <div className="mt-3 h-1.5 bg-black/20 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              color === 'blue' ? 'bg-blue-500' : 
              color === 'purple' ? 'bg-purple-500' : 'bg-amber-500'
            }`}
            style={{ width: `${value}%` }}
          />
        </div>
      )}
    </div>
  )
}
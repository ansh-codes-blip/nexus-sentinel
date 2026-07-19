import { useState } from 'react'
import { ScanLine, Laptop, Smartphone, Server, RefreshCw } from 'lucide-react'

interface Device {
  ip_address: string;
  hostname: string;
  mac_address: string;
  vendor: string;
  status: string;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [lastScan, setLastScan] = useState<string>('')

  const runScan = async () => {
    setIsScanning(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/devices/scan')
      const data = await res.json()
      if (data.status === 'success') {
        setDevices(data.devices)
        setLastScan(new Date().toLocaleTimeString())
      } else {
        console.error('Scan failed:', data.message)
      }
    } catch (err) {
      console.error('Failed to connect to backend:', err)
    } finally {
      setIsScanning(false)
    }
  }

  const getDeviceIcon = (hostname: string, vendor: string) => {
    const str = (hostname + vendor).toLowerCase()
    if (str.includes('phone') || str.includes('samsung') || str.includes('xiaomi')) return Smartphone
    if (str.includes('server') || str.includes('router') || str.includes('asus')) return Server
    return Laptop
  }

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Device Discovery</h1>
          <p className="text-sm text-zinc-500">
            {lastScan ? `Last scanned at ${lastScan}` : 'Identify devices on your local network'}
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
          {isScanning ? 'Scanning...' : 'Scan Network'}
        </button>
      </header>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-nexus_border text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <div className="col-span-1"></div>
          <div className="col-span-3">Hostname</div>
          <div className="col-span-2">IP Address</div>
          <div className="col-span-3">MAC Address</div>
          <div className="col-span-2">Vendor</div>
          <div className="col-span-1">Status</div>
        </div>

        <div className="divide-y divide-nexus_border/50">
          {devices.length === 0 && !isScanning ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
              <ScanLine className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Click "Scan Network" to discover devices</p>
            </div>
          ) : devices.length === 0 && isScanning ? (
            <div className="flex items-center justify-center py-20 text-zinc-500 text-sm">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Sending ARP requests...
            </div>
          ) : (
            devices.map((device, i) => {
              const Icon = getDeviceIcon(device.hostname, device.vendor)
              const isOnline = device.status === 'online'
              return (
                <div key={i} className={`grid grid-cols-12 gap-4 px-6 py-3 hover:bg-white/5 transition-colors items-center ${!isOnline ? 'opacity-40' : ''}`}>
                  <div className="col-span-1">
                    <div className="p-2 rounded-lg bg-white/5 w-fit">
                      <Icon className="w-4 h-4 text-zinc-400" />
                    </div>
                  </div>
                  <div className="col-span-3 font-medium text-white">{device.hostname}</div>
                  <div className="col-span-2 font-mono text-sm text-zinc-300">{device.ip_address}</div>
                  <div className="col-span-3 font-mono text-sm text-zinc-500">{device.mac_address}</div>
                  <div className="col-span-2 text-sm text-zinc-400 truncate">{device.vendor}</div>
                  <div className="col-span-1">
                    <span className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-green-400' : 'text-zinc-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`}></span>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
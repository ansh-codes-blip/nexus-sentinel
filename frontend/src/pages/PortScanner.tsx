import { useEffect, useState, useCallback } from 'react'
import { ScanLine, Server, Loader, ShieldAlert, CheckCircle, AlertTriangle, ExternalLink, Terminal, Lightbulb } from 'lucide-react'

interface Device {
  id: number;
  ip_address: string;
  hostname: string;
  status: string;
}

interface Vulnerability {
  cve_id: string;
  cvss_score: number;
  reference: string;
}

interface PortResult {
  port: number;
  protocol: string;
  state: string;
  service: string;
  version: string;
  risk_level: string;
  vulnerabilities: Vulnerability[];
  scripts: string[];
  remediation: string;
}

interface ScanResult {
  ip: string;
  os: string;
  ports: PortResult[];
  profile: string;
}

export default function PortScanner() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedIp, setSelectedIp] = useState<string | null>(null)
  const [scanType, setScanType] = useState('cve')
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'complete' | 'error'>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/devices')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') setDevices(data.devices)
      })
  }, [])

  const checkStatus = useCallback(async (ip: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/scans/status?target_ip=${ip}`)
      const data = await res.json()
      setScanStatus(data.status)
      
      if (data.status === 'complete' || data.status === 'error') {
        if (data.results) setScanResult(data.results)
      } else if (data.status === 'scanning') {
        setTimeout(() => checkStatus(ip), 3000)
      }
    } catch (err) {
      setScanStatus('error')
    }
  }, [])

  const startScan = async (ip: string, type: string) => {
    setSelectedIp(ip)
    setScanStatus('scanning')
    setScanResult(null)
    try {
      await fetch(`http://127.0.0.1:8000/api/scans/start?target_ip=${ip}&scan_type=${type}`, { method: 'POST' })
      checkStatus(ip)
    } catch (err) {
      setScanStatus('error')
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-red-500/10 text-red-400 border-red-500/30'
      case 'High': return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
      case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      case 'Low': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
    }
  }

  const scanTypes = [
    { id: 'cve', name: 'Service & CVE', desc: 'TCP version + Vulners DB' },
    { id: 'udp', name: 'UDP Discovery', desc: 'Find hidden DNS/SNMP' },
    { id: 'os', name: 'OS Fingerprint', desc: 'Identify Operating System' },
    { id: 'deep', name: 'Deep Aggressive', desc: 'Full ID (Slow but thorough)' },
    { id: 'web', name: 'Web Exploit', desc: 'HTTP dirs & Shellshock' },
    { id: 'evasion', name: 'Firewall Evasion', desc: 'Fragmented SYN Stealth' },
  ]

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Advanced Vulnerability Scanner</h1>
        <p className="text-sm text-zinc-500">Utilize specialized penetration testing profiles</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Devices List */}
        <div className="glass-card p-4 overflow-y-auto">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Target Devices</h3>
          <div className="space-y-2">
            {devices.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-4">No devices found.</p>
            ) : (
              devices.map(dev => (
                <button
                  key={dev.id}
                  onClick={() => setSelectedIp(dev.ip_address)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedIp === dev.ip_address ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-zinc-400" />
                    <div>
                      <div className="text-sm font-medium text-white">{dev.hostname}</div>
                      <div className="text-xs text-zinc-500 font-mono">{dev.ip_address}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Scan Execution & Results */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
          {selectedIp ? (
            <>
              {/* Scan Options */}
              <div className="glass-card p-4">
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
                  Scan Profile for {selectedIp}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {scanTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setScanType(type.id)}
                      className={`p-3 rounded-lg text-left transition-colors ${
                        scanType === type.id ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-black/20 border border-nexus_border hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{type.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">{type.desc}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => startScan(selectedIp, scanType)}
                  disabled={scanStatus === 'scanning'}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg py-2 font-medium disabled:opacity-50"
                >
                  {scanStatus === 'scanning' ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  {scanStatus === 'scanning' ? 'Executing Penetration Test...' : 'Launch Scan'}
                </button>
              </div>

              {/* Results Area */}
              <div className="glass-card p-4 flex-1 overflow-y-auto">
                {scanStatus === 'idle' && (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-20">
                    <Terminal className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">Select a profile to begin assessment</p>
                  </div>
                )}
                
                {scanStatus === 'scanning' && (
                  <div className="flex flex-col items-center justify-center h-full text-blue-400 py-20">
                    <Loader className="w-8 h-8 animate-spin mb-4" />
                    <p className="text-sm">Running {scanType.toUpperCase()} scripts... This may take several minutes.</p>
                  </div>
                )}

                {scanStatus === 'error' && (
                  <div className="flex flex-col items-center justify-center h-full text-red-400 py-20">
                    <ShieldAlert className="w-8 h-8 mb-4" />
                    {/* Display the raw error string from backend if available */}
                    <p className="text-sm text-center px-4">{typeof scanResult === 'string' ? scanResult : "Scan failed. Ensure backend is running with sudo."}</p>
                  </div>
                )}

                {scanStatus === 'complete' && scanResult && typeof scanResult === 'object' && (
                  <div className="space-y-4">
                    <div className="bg-black/20 rounded-lg p-4 border border-nexus_border flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 text-green-400 mb-2">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium uppercase">Scan Complete</span>
                        </div>
                        <div className="text-sm text-white">
                          Profile: <span className="font-mono text-blue-400">{scanResult.profile}</span>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 font-mono">
                        OS: {scanResult.os}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                        Threat Intelligence Report
                      </h4>
                      <div className="space-y-4">
                        {scanResult.ports.map((port, i) => (
                          <div key={i} className={`p-4 rounded-lg border ${getRiskColor(port.risk_level)} bg-black/20`}>
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                              <div className="flex items-center gap-3 font-mono text-sm">
                                <span className="font-bold text-white text-lg">{port.port}/{port.protocol}</span>
                                <div>
                                  <div className="text-zinc-300 capitalize">{port.service}</div>
                                  {port.version && <span className="text-zinc-500 text-xs">v{port.version}</span>}
                                </div>
                              </div>
                              <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${getRiskColor(port.risk_level)}`}>
                                {port.risk_level} Risk
                              </div>
                            </div>

                            {/* Remediation Advice Box */}
                            {port.state === 'open' && (
                              <div className="mb-3 flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 p-3 rounded-lg">
                                <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <div className="text-xs font-bold text-blue-400 uppercase mb-1">Recommended Action</div>
                                  <p className="text-xs text-zinc-300">{port.remediation}</p>
                                </div>
                              </div>
                            )}

                            {/* Render Script Outputs */}
                            {port.scripts.length > 0 && (
                              <div className="mb-3 space-y-1 text-xs bg-black/40 p-2 rounded font-mono border border-white/5">
                                {port.scripts.map((script, j) => (
                                  <div key={j} className="text-zinc-400 whitespace-pre-wrap">{script}</div>
                                ))}
                              </div>
                            )}

                            {/* Render CVEs */}
                            {port.vulnerabilities.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-red-400 uppercase flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Confirmed Vulnerabilities ({port.vulnerabilities.length})
                                </div>
                                {port.vulnerabilities.map((vuln, j) => (
                                  <div key={j} className="flex items-center justify-between bg-red-500/5 border border-red-500/10 p-2 rounded text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-white">{vuln.cve_id}</span>
                                      <span className="text-zinc-500">CVSS: {vuln.cvss_score}</span>
                                    </div>
                                    <a 
                                      href={vuln.reference} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                    >
                                      Exploit Details <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="glass-card flex-1 flex flex-col items-center justify-center text-zinc-600">
              <Server className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Select a target device to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
import { useEffect, useState, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
} from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Cloud, Router as RouterIcon, Laptop, Smartphone, HelpCircle, RefreshCw } from 'lucide-react'

// ... rest of the code remains exactly the same
interface Device {
  id: number;
  ip_address: string;
  hostname: string;
  mac_address: string;
  vendor: string;
  status: string;
  device_type: string;
}

// Custom Node Component
const DeviceNode = ({ data }: { data: any }) => {
  const Icon = data.icon
  const isOnline = data.status === 'online'
  
  return (
    <div className={`glass-card px-4 py-3 flex flex-col items-center w-40 transition-all ${isOnline ? 'opacity-100' : 'opacity-50'}`}>
      <div className={`p-2 rounded-lg mb-2 ${isOnline ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-xs font-bold text-white truncate w-full text-center">{data.label}</div>
      <div className="text-[10px] text-zinc-500 font-mono mt-1">{data.ip}</div>
      <div className={`mt-2 px-2 py-0.5 rounded text-[9px] ${isOnline ? 'bg-green-500/10 text-green-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
        {isOnline ? 'ONLINE' : 'OFFLINE'}
      </div>
    </div>
  )
}

const nodeTypes = { device: DeviceNode }

export default function Topology() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  const [isScanning, setIsScanning] = useState(false)

  const buildGraph = useCallback((devices: Device[]) => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Internet Node
    newNodes.push({
      id: 'internet',
      type: 'device',
      position: { x: 400, y: 0 },
      data: { label: 'Internet', ip: '0.0.0.0', status: 'online', icon: Cloud },
      targetPosition: Position.Bottom,
      sourcePosition: Position.Bottom,
    })

    // Find Router
    const router = devices.find(d => d.device_type === 'router') || devices[0]
    
    if (router) {
      newNodes.push({
        id: `dev-${router.id}`,
        type: 'device',
        position: { x: 400, y: 150 },
        data: { label: router.hostname, ip: router.ip_address, status: router.status, icon: RouterIcon },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
      })
      newEdges.push({
        id: 'e-internet-router',
        source: 'internet',
        target: `dev-${router.id}`,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      })

      // Other Devices
      const childDevices = devices.filter(d => d.id !== router.id)
      childDevices.forEach((dev, index) => {
        const angle = (index / childDevices.length) * Math.PI - Math.PI / 2
        const radius = 200
        const x = 400 + Math.cos(angle) * radius
        const y = 350 + Math.sin(angle) * radius * 0.8
        
        let Icon = HelpCircle
        if (dev.device_type === 'phone') Icon = Smartphone
        else if (dev.device_type === 'laptop') Icon = Laptop
        
        newNodes.push({
          id: `dev-${dev.id}`,
          type: 'device',
          position: { x, y },
          data: { label: dev.hostname, ip: dev.ip_address, status: dev.status, icon: Icon },
          targetPosition: Position.Top,
        })
        newEdges.push({
          id: `e-router-${dev.id}`,
          source: `dev-${router.id}`,
          target: `dev-${dev.id}`,
          animated: dev.status === 'online',
          style: { stroke: dev.status === 'online' ? '#10b981' : '#52525b', strokeWidth: 1.5 }
        })
      })
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }, [setNodes, setEdges])

  const fetchDevices = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/devices')
      const data = await res.json()
      if (data.status === 'success') buildGraph(data.devices)
    } catch (err) {
      console.error(err)
    }
  }

  const runScan = async () => {
    setIsScanning(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/devices/scan')
      const data = await res.json()
      if (data.status === 'success') buildGraph(data.devices)
    } catch (err) {
      console.error(err)
    } finally {
      setIsScanning(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Network Topology</h1>
          <p className="text-sm text-zinc-500">Visual map of your local network</p>
        </div>
        <button
          onClick={runScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Refresh Map'}
        </button>
      </header>

      <div className="glass-card flex-1 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          className="bg-nexus_bg"
        >
          <Background color="#27272a" gap={20} />
          <Controls className="!bg-nexus_card !border-nexus_border !rounded-lg !overflow-hidden" />
          <MiniMap 
            className="!bg-nexus_card !border-nexus_border" 
            nodeColor={(n) => n.data?.status === 'online' ? '#3b82f6' : '#52525b'}
            maskColor="rgba(0,0,0,0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
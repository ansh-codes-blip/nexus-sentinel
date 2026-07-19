import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Shield, LayoutDashboard, Network, ScanLine, Bot, FileText, Gauge, Globe, ShieldAlert, ScrollText, LogOut } from 'lucide-react'
import { useAuth } from '../stores/AuthContext'

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Live Capture', path: '/capture', icon: Network },
  { name: 'Devices', path: '/devices', icon: ScanLine },
  { name: 'Topology', path: '/topology', icon: Network },
  { name: 'Port Scanner', path: '/scanner', icon: Shield },
  { name: 'Bandwidth', path: '/bandwidth', icon: Gauge },
  { name: 'DNS Monitor', path: '/dns', icon: Globe },
  { name: 'Threat Detection', path: '/threats', icon: ShieldAlert },
  { name: 'Logs', path: '/logs', icon: ScrollText },
  { name: 'AI Assistant', path: '/ai', icon: Bot },
  { name: 'Reports', path: '/reports', icon: FileText },
]

export default function MainLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/') // Redirect to auth page
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-nexus_border bg-black/20 backdrop-blur-xl flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-nexus_border">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-lg tracking-tight">Nexus Sentinel</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-500/10 text-blue-400' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-nexus_border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-nexus_bg">
        <Outlet />
      </main>
    </div>
  )
}
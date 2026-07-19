import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './stores/AuthContext'
import Auth from './pages/Auth'
import MainLayout from './layouts/MainLayout'

// 1. Import lightweight pages normally
import Dashboard from './pages/Dashboard'

// 2. Lazy load heavy pages (Chart.js, React Flow, etc.)
const LiveCapture = lazy(() => import('./pages/LiveCapture'))
const Devices = lazy(() => import('./pages/Devices'))
const Topology = lazy(() => import('./pages/Topology'))
const PortScanner = lazy(() => import('./pages/PortScanner'))
const Bandwidth = lazy(() => import('./pages/Bandwidth'))
const DnsMonitor = lazy(() => import('./pages/DnsMonitor'))
const ThreatDetection = lazy(() => import('./pages/ThreatDetection'))
const Logs = lazy(() => import('./pages/Logs'))
const AiAssistant = lazy(() => import('./pages/AiAssistant'))
const Reports = lazy(() => import('./pages/Reports'))

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-pulse text-zinc-500">Loading module...</div>
  </div>
)

function AppRoutes() {
  const { token } = useAuth()

  if (!token) {
    return <Auth />
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        {/* Wrap lazy routes in Suspense */}
        <Route path="/capture" element={<Suspense fallback={<PageLoader />}><LiveCapture /></Suspense>} />
        <Route path="/devices" element={<Suspense fallback={<PageLoader />}><Devices /></Suspense>} />
        <Route path="/topology" element={<Suspense fallback={<PageLoader />}><Topology /></Suspense>} />
        <Route path="/scanner" element={<Suspense fallback={<PageLoader />}><PortScanner /></Suspense>} />
        <Route path="/bandwidth" element={<Suspense fallback={<PageLoader />}><Bandwidth /></Suspense>} />
        <Route path="/dns" element={<Suspense fallback={<PageLoader />}><DnsMonitor /></Suspense>} />
        <Route path="/threats" element={<Suspense fallback={<PageLoader />}><ThreatDetection /></Suspense>} />
        <Route path="/logs" element={<Suspense fallback={<PageLoader />}><Logs /></Suspense>} />
        <Route path="/ai" element={<Suspense fallback={<PageLoader />}><AiAssistant /></Suspense>} />
        <Route path="/reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}

export default App
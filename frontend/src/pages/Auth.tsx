import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock, User } from 'lucide-react'
import { useAuth } from '../stores/AuthContext'

export default function Auth() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Authentication failed')
      }

      const data = await res.json()
      login(data.access_token)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-nexus_bg p-8">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 mb-4">
            <Shield className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nexus Sentinel</h1>
          <p className="text-sm text-zinc-500 mt-1">Login or Create Account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/30 border border-nexus_border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/30 border border-nexus_border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                required
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg py-2.5 font-medium transition-colors"
          >
            Login / Create
          </button>
        </form>
      </div>
    </div>
  )
}
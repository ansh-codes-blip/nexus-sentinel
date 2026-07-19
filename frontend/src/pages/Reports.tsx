import { useState } from 'react'
import { FileText, Download, Loader2, CheckCircle } from 'lucide-react'

export default function Reports() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const generateReport = async () => {
    setIsGenerating(true)
    setStatus('idle')
    try {
      // Fetch the file as a blob
      const res = await fetch('http://127.0.0.1:8000/api/reports/generate')
      if (!res.ok) throw new Error('Generation failed')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Nexus_Sentinel_Report_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
      
      setStatus('success')
    } catch (err) {
      console.error('Failed to generate report:', err)
      setStatus('error')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-sm text-zinc-500">Generate comprehensive PDF intelligence reports</p>
      </header>

      <div className="glass-card p-8 max-w-2xl mx-auto text-center">
        <div className="mb-6 flex justify-center">
          {status === 'success' ? (
            <CheckCircle className="w-16 h-16 text-green-500" />
          ) : (
            <FileText className="w-16 h-16 text-blue-500" />
          )}
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2">Network Intelligence Report</h2>
        <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
          Compiles all discovered devices, recent security threats, and system logs into a professional PDF document.
        </p>
        
        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 w-full max-w-xs mx-auto bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg py-3 font-medium disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          {isGenerating ? 'Generating PDF...' : 'Download Report (PDF)'}
        </button>
        
        {status === 'success' && (
          <p className="text-xs text-green-400 mt-4">Report downloaded successfully!</p>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-400 mt-4">Failed to generate report. Check backend logs.</p>
        )}
      </div>
    </div>
  )
}
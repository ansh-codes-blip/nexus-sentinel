import { useEffect, useState, useRef } from 'react'
import { Bot, User, Send, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'ai';
  content: string;
  isStreaming?: boolean;
}

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'ai', 
      content: "Hello, I am Nexus Sentinel AI. I can explain network protocols, analyze packets, or help you understand security threats. How can I assist you today?" 
    }
  ])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Connect to AI WebSocket
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/ai')
    wsRef.current = ws

    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'chunk') {
        setIsThinking(false)
        
        // FIX: Use functional state update and immutable object creation
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMsg = newMessages[newMessages.length - 1]
          
          if (lastMsg && lastMsg.role === 'ai' && lastMsg.isStreaming) {
            // Create a NEW object with the updated content
            newMessages[newMessages.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + data.content
            }
          } else {
            // Create new streaming message
            newMessages.push({ role: 'ai', content: data.content, isStreaming: true })
          }
          return newMessages
        })
      } else if (data.type === 'done') {
        // Mark streaming as complete
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMsg = newMessages[newMessages.length - 1]
          if (lastMsg) {
            newMessages[newMessages.length - 1] = { ...lastMsg, isStreaming: false }
          }
          return newMessages
        })
      } else if (data.type === 'error') {
        setIsThinking(false)
        setMessages(prev => [...prev, { role: 'ai', content: `Error: ${data.content}` }])
      }
    }

    return () => ws.close()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !isConnected) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsThinking(true)

    // Send to backend
    wsRef.current?.send(userMsg)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
          <p className="text-sm text-zinc-500">Powered by local Ollama model (gemma:2b)</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-500/10 border border-zinc-500/20">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`}></span>
          <span className="text-xs text-zinc-400 font-medium">{isConnected ? 'Model Ready' : 'Connecting...'}</span>
        </div>
      </header>

      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-blue-500/10 border border-blue-500/20 text-white' 
                  : 'bg-black/20 border border-nexus_border text-zinc-200'
              }`}>
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                {msg.isStreaming && <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse"></span>}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-zinc-400" />
                </div>
              )}
            </div>
          ))}
          
          {isThinking && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div className="bg-black/20 border border-nexus_border rounded-lg px-4 py-3 flex items-center text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Analyzing...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-nexus_border p-4">
          <div className="flex items-center gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about a packet, threat, or network concept..."
              rows={1}
              className="flex-1 bg-black/30 border border-nexus_border rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 resize-none max-h-32"
              style={{ minHeight: '48px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !isConnected || isThinking}
              className="p-3 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
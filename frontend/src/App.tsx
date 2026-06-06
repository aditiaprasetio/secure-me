import { useCallback, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import Terminal from './components/Terminal'
import AIRecommendation from './components/AIRecommendation'
import History from './components/History'
import SettingsModal from './components/SettingsModal'

export interface Scan {
  id: string; status: string; target: string; tool: string;
  args: string; output: string[]; recommendation?: AISavedResult;
  created_at: string; completed_at: string | null;
}
export interface AISettings { provider: string; model: string; key: string }
export interface AISavedResult { provider: string; model: string; result: string; created_at: string }

const AI_STORAGE_KEY = 'secureme_ai_settings'
const HISTORY_KEY = 'secureme_scan_history'

function loadSettings(): AISettings | null {
  try { const r = localStorage.getItem(AI_STORAGE_KEY); return r ? JSON.parse(r) : null } catch { return null }
}

function loadHistory(): Scan[] {
  try { const r = localStorage.getItem(HISTORY_KEY); return r ? JSON.parse(r) : [] } catch { return [] }
}

function saveScanToHistory(scan: Scan) {
  const history = loadHistory().filter(s => s.id !== scan.id)
  history.unshift(scan)
  if (history.length > 50) history.length = 50
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)) } catch {}
}

function saveRecToHistory(scanId: string, rec: AISavedResult) {
  const history = loadHistory()
  const idx = history.findIndex(s => s.id === scanId)
  if (idx === -1) return
  history[idx] = { ...history[idx], recommendation: rec }
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)) } catch {}
}

export default function App() {
  const [currentScanId, setCurrentScanId] = useState<string | null>(null)
  const [outputLines, setOutputLines] = useState<string[]>([])
  const [scanStatus, setScanStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiSettings, setAiSettings] = useState<AISettings | null>(loadSettings)
  const [scans, setScans] = useState<Scan[]>(() => loadHistory())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const outputLinesRef = useRef<string[]>([])

  const connectStream = useCallback((scanId: string, meta: {
    id: string; target: string; tool: string; args: string; created_at: string;
  }) => {
    if (esRef.current) esRef.current.close()
    const es = new EventSource(`/api/scan/${scanId}/stream`)
    esRef.current = es
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'output') {
        setOutputLines(prev => {
          const next = [...prev, msg.data]
          outputLinesRef.current = next
          return next
        })
      } else if (msg.type === 'done') {
        setScanStatus('done')
        es.close()
        esRef.current = null

        const completedScan: Scan = {
          id: meta.id,
          status: 'completed',
          target: meta.target,
          tool: meta.tool,
          args: meta.args,
          output: outputLinesRef.current,
          created_at: meta.created_at,
          completed_at: new Date().toISOString(),
        }
        saveScanToHistory(completedScan)
        setScans(loadHistory())
      }
    }
    es.onerror = () => {
      setScanStatus('done')
      es.close()
      esRef.current = null
    }
  }, [])

  const startScan = useCallback(async (target: string, tool: string, args: string) => {
    if (esRef.current) { esRef.current.close(); esRef.current = null }
    setCurrentScanId(null)
    setOutputLines([])
    outputLinesRef.current = []
    setAiResult(null)
    setScanStatus('running')

    try {
      const r = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, tool, args }),
      })
      const data = await r.json()
      setCurrentScanId(data.scan_id)
      const meta = {
        id: data.scan_id,
        target: data.target,
        tool: data.tool,
        args: data.args,
        created_at: data.created_at,
      }
      connectStream(data.scan_id, meta)
    } catch (e: any) {
      setOutputLines([`[!] Failed: ${e.message}`])
      outputLinesRef.current = [`[!] Failed: ${e.message}`]
      setScanStatus('done')
    }
  }, [connectStream])

  const loadScan = useCallback((id: string) => {
    if (esRef.current) { esRef.current.close(); esRef.current = null }
    setCurrentScanId(id)
    setScanStatus('done')
    const match = loadHistory().find(s => s.id === id)
    setOutputLines(match?.output ?? [])
    setAiResult(match?.recommendation?.result ?? null)
  }, [])

  const clearOutput = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null }
    setCurrentScanId(null)
    setOutputLines([])
    outputLinesRef.current = []
    setAiResult(null)
    setScanStatus('idle')
  }, [])

  const getRecommendation = useCallback(async () => {
    const id = currentScanId
    if (!id) return
    const match = loadHistory().find(s => s.id === id)
    if (!match) return

    const s = loadSettings()
    if (!s || !s.key) { setSettingsOpen(true); return }
    setAiResult('⏳ Analyzing scan results with AI...')
    try {
      const r = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: s.provider,
          model: s.model,
          api_key: s.key,
          target: match.target,
          tool: match.tool,
          args: match.args,
          output: match.output,
        }),
      })
      if (!r.ok) { const err = await r.json(); throw new Error(err.detail) }
      const d = await r.json()
      const rec: AISavedResult = {
        provider: s.provider, model: s.model,
        result: d.result, created_at: new Date().toISOString(),
      }
      saveRecToHistory(id, rec)
      setScans(loadHistory())
      setAiResult(d.result)
    } catch (e: any) {
      setAiResult(`⚠ Error: ${e.message}`)
    }
  }, [currentScanId])

  const saveSettings = useCallback((s: AISettings) => {
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(s))
    setAiSettings(s)
    setSettingsOpen(false)
  }, [])

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center gap-3 px-6 py-3.5 bg-surface border-b border-border shrink-0">
        <h1 className="text-lg font-semibold text-primary">SecureMe</h1>
        <span className="text-text-dim text-xs">Security Pentest Dashboard</span>
        <div className="flex-1" />
        <button onClick={() => setSettingsOpen(true)}
          className="text-text-dim hover:text-text hover:bg-surface-2 rounded p-1 text-xl leading-none bg-none border-none cursor-pointer">
          ⚙
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onStart={startScan} running={scanStatus === 'running'} />

        <div className="flex-1 flex flex-col p-5 gap-3 overflow-hidden">
          <div className="shrink-0 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wider text-text-dim font-medium">Output</h2>
            <div className="flex items-center gap-2">
              {scanStatus !== 'idle' && (
                <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border
                  ${scanStatus === 'running' ? 'text-primary border-primary' : 'text-accent border-accent'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${scanStatus === 'running' ? 'bg-primary animate-pulse' : 'bg-accent'}`} />
                  {scanStatus === 'running' ? 'Scanning...' : 'Completed'}
                </span>
              )}
              <button onClick={clearOutput}
                className="btn-ghost text-xs px-3 py-1.5">Clear</button>
            </div>
          </div>

          <Terminal lines={outputLines} status={scanStatus} />
          <AIRecommendation
            result={aiResult}
            configured={!!(aiSettings?.key)}
            providerLabel={aiSettings ? `${aiSettings.provider} — ${aiSettings.model}` : ''}
            onAnalyze={getRecommendation}
          />
          <History scans={scans} onLoad={loadScan} />
        </div>
      </div>

      {settingsOpen && (
        <SettingsModal
          settings={aiSettings}
          onSave={saveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

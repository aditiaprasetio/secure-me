import { useEffect, useRef, useState } from 'react'

interface Props { onStart: (target: string, tool: string, args: string) => void; running: boolean }

const TOOL_PLACEHOLDERS: Record<string, string> = {
  nmap: 'scanme.nmap.org or 192.168.1.1',
  nikto: 'https://example.com', sqlmap: 'http://example.com/page?id=1',
  whatweb: 'https://example.com', gobuster: 'https://example.com',
  dnsrecon: 'example.com',
}

interface Tool { id: string; name: string; desc: string; placeholder: string }

export default function Sidebar({ onStart, running }: Props) {
  const [tools, setTools] = useState<Tool[]>([])
  const [tool, setTool] = useState('')
  const [target, setTarget] = useState('')
  const [args, setArgs] = useState('')
  const targetRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/tools').then(r => r.json()).then((t: Tool[]) => {
      setTools(t); if (t.length) setTool(t[0].id)
    })
  }, [])

  const sel = tools.find(t => t.id === tool)

  const handleStart = () => {
    if (!target.trim()) {
      targetRef.current?.focus()
      targetRef.current && (targetRef.current.style.borderColor = 'var(--danger)')
      setTimeout(() => { if (targetRef.current) targetRef.current.style.borderColor = '' }, 1500)
      return
    }
    onStart(target.trim(), tool, args.trim())
  }

  return (
    <aside className="w-[360px] min-w-[360px] bg-surface border-r border-border flex flex-col p-5 gap-4 overflow-y-auto">
      <h2 className="text-xs uppercase tracking-wider text-text-dim font-medium">Scan Configuration</h2>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-dim">Target</label>
        <input ref={targetRef} value={target} onChange={e => setTarget(e.target.value)}
          placeholder={sel?.placeholder || 'Enter target'}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
          className="bg-bg border border-border rounded px-3 py-2.5 text-sm text-text font-mono" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-dim">Tool</label>
        <select value={tool} onChange={e => setTool(e.target.value)}
          className="bg-bg border border-border rounded px-3 py-2.5 text-sm text-text font-mono cursor-pointer">
          {tools.map(t => <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-dim">Additional Args <span className="font-normal text-text-dim">(optional)</span></label>
        <input value={args} onChange={e => setArgs(e.target.value)}
          placeholder="Override default arguments"
          className="bg-bg border border-border rounded px-3 py-2.5 text-sm text-text font-mono" />
      </div>

      {sel && (
        <div className="text-xs text-text-dim px-3 py-2 bg-bg rounded border-l-[3px] border-l-accent leading-relaxed min-h-[36px]">
          {sel.desc}
        </div>
      )}

      <button onClick={handleStart} disabled={running}
        className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 rounded font-semibold text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
        ▶ Run Scan
      </button>

      <div className="mt-2 px-3 py-2.5 bg-bg rounded border border-border text-[11px] text-text-dim leading-relaxed">
        <strong>⚠ Warning:</strong> Only scan targets you own or have explicit permission to test.
      </div>
    </aside>
  )
}

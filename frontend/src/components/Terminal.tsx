import { useEffect, useRef } from 'react'

interface Props { lines: string[]; status: string }

function lineClass(line: string) {
  if (line.startsWith('$ ')) return 'text-primary'
  if (line.startsWith('[!]')) return 'text-danger'
  if (line.startsWith('[*]') || line.startsWith('[+]')) return 'text-accent'
  if (line.startsWith('[w]')) return 'text-warning'
  return ''
}

export default function Terminal({ lines, status }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const items = lines ?? []

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [items])

  if (items.length === 0 && status === 'idle') {
    return (
      <div className="flex-1 min-h-[120px] bg-[#060b16] border border-border rounded p-4 flex flex-col items-center justify-center text-text-dim gap-3">
        <div className="text-5xl opacity-30">☠</div>
        <p className="text-sm">Configure a scan and hit <strong className="text-text">Run Scan</strong></p>
        <p className="text-xs">Output will appear here in real-time</p>
      </div>
    )
  }

  return (
    <div ref={ref} className="flex-1 min-h-[120px] bg-[#060b16] border border-border rounded p-4 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap break-all">
      {items.map((l, i) => (
        <div key={i} className={lineClass(l) || ''}>{l}</div>
      ))}
    </div>
  )
}

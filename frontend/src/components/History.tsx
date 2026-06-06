import { useEffect, useState } from 'react'
import type { Scan } from '../App'

interface Props { scans: Scan[]; onLoad: (id: string) => void }

export default function History({ scans, onLoad }: Props) {
  const list = scans ?? []
  return (
    <div className="border-t border-border pt-2.5 shrink-0 max-h-[100px] overflow-y-auto">
      <h3 className="text-xs uppercase tracking-wider text-text-dim font-medium mb-1.5">Recent Scans</h3>
      {list.length === 0 ? (
        <div className="text-text-dim text-xs py-1">No completed scans yet</div>
      ) : (
        list.slice(0, 20).map(s => (
          <div key={s.id} onClick={() => onLoad(s.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer hover:bg-surface-2 text-xs transition-colors">
            {s.recommendation && <span className="text-primary shrink-0" title="Has AI recommendation">◆</span>}
            <span className="text-accent min-w-[60px]">{s.tool}</span>
            <span className="text-text flex-1 truncate">{s.target}</span>
            <span className="text-text-dim text-[11px] shrink-0">
              {new Date(s.completed_at!).toLocaleTimeString()}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { AISettings } from '../App'

interface Props {
  settings: AISettings | null
  onSave: (s: AISettings) => void
  onClose: () => void
}

interface Provider { id: string; name: string; models: string[]; default_model: string }

export default function SettingsModal({ settings, onSave, onClose }: Props) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [key, setKey] = useState('')
  const [toast, setToast] = useState(false)

  useEffect(() => {
    fetch('/api/providers').then(r => r.json()).then((p: Provider[]) => {
      setProviders(p)
      if (settings) {
        setProvider(settings.provider)
        setModel(settings.model)
        setKey(settings.key)
      } else if (p.length) {
        setProvider(p[0].id)
        setModel(p[0].default_model)
      }
    })
  }, [settings])

  const current = providers.find(p => p.id === provider)

  useEffect(() => {
    if (current && !settings) setModel(current.default_model)
  }, [provider, current, settings])

  const handleSave = () => {
    if (!key.trim()) return
    onSave({ provider, model, key: key.trim() })
    setToast(true)
    setTimeout(() => setToast(false), 2000)
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-xl p-7 w-[460px] max-w-[90vw] flex flex-col gap-5">
        <h2 className="text-base text-text">⚙ AI Settings</h2>
        <p className="text-xs text-text-dim leading-relaxed">
          Configure your AI provider and credentials. Settings are saved to your browser's local storage.
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-dim">Provider</label>
          <select value={provider} onChange={e => setProvider(e.target.value)}
            className="bg-bg border border-border rounded px-3 py-2.5 text-sm text-text font-mono cursor-pointer">
            {providers.map(p => (
              <option key={p.id} value={p.id} data-models={JSON.stringify(p.models)} data-default={p.default_model}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-dim">Model</label>
          <select value={model} onChange={e => setModel(e.target.value)}
            className="bg-bg border border-border rounded px-3 py-2.5 text-sm text-text font-mono cursor-pointer">
            {(current?.models || []).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-dim">API Key</label>
          <input type="password" value={key} onChange={e => setKey(e.target.value)}
            placeholder="sk-... or your API key"
            className="bg-bg border border-border rounded px-3 py-2.5 text-sm text-text font-mono" />
        </div>

        {toast && <div className="text-xs text-primary text-center">✓ Settings saved</div>}

        <div className="flex gap-2 justify-end mt-1">
          <button onClick={onClose}
            className="bg-transparent text-text-dim border border-border rounded px-5 py-2 text-sm font-semibold cursor-pointer hover:border-text-dim hover:text-text">Cancel</button>
          <button onClick={handleSave}
            className="bg-primary text-black px-5 py-2 rounded text-sm font-semibold cursor-pointer border-none hover:bg-primary-dim">Save Settings</button>
        </div>
      </div>
    </div>
  )
}

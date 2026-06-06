import { useState } from 'react'
import Markdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

interface Props {
  result: string | null
  configured: boolean
  providerLabel: string
  onAnalyze: () => void
}

function ResultView({ content }: { content: string }) {
  if (content.startsWith('⏳') || content.startsWith('⚠')) {
    return <span className={content.startsWith('⏳') ? 'text-primary' : 'text-danger'}>{content}</span>
  }

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        h1: ({ children }) => <h1 className="text-accent font-bold text-lg mt-4 mb-2 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-accent font-bold text-base mt-3 mb-2 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-accent font-semibold text-sm mt-3 mb-1 first:mt-0">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
        li: ({ children }) => <li className="text-text-dim">{children}</li>,
        p: ({ children }) => <p className="text-text-dim my-1.5">{children}</p>,
        code: ({ children }) => (
          <code className="bg-[#0e1629] text-primary px-1.5 py-0.5 rounded text-xs">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="bg-[#0e1629] border border-border rounded p-3 my-2 overflow-x-auto text-xs">{children}</pre>
        ),
        hr: () => <hr className="border-border my-3" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-accent pl-3 my-2 text-text-dim italic">{children}</blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline hover:opacity-80">{children}</a>
        ),
      }}
    >
      {content}
    </Markdown>
  )
}

export default function AIRecommendation({ result, configured, providerLabel, onAnalyze }: Props) {
  const [collapsed, setCollapsed] = useState(true)

  const hasResult = result !== null

  return (
    <div className={`shrink-0 border border-border rounded overflow-hidden ${collapsed && !hasResult ? '' : ''}`}>
      <div onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none bg-surface-2 border-b border-border hover:opacity-90">
        <h3 className="text-xs uppercase tracking-wider text-accent font-medium">◁ AI Recommendation</h3>
        <span className={`text-text-dim text-sm transition-transform ${collapsed ? '-rotate-90' : ''}`}>▼</span>
      </div>

      {!collapsed && (
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-text-dim flex items-center gap-2">
              {configured ? (
                <><span className="text-primary">✓</span> {providerLabel}</>
              ) : (
                <><span className="text-danger">⚠</span> Not configured — click ⚙ to set up</>
              )}
            </span>
            <button onClick={onAnalyze}
              className="bg-accent text-white px-4 py-2 rounded text-sm font-semibold cursor-pointer border-none hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
              ▶ Analyze with AI
            </button>
          </div>

          {hasResult && (
            <div className="bg-[#060b16] border border-border rounded p-4 max-h-[400px] overflow-y-auto text-sm leading-relaxed">
              <ResultView content={result} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

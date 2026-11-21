import { useEffect } from 'react'
import mermaid from 'mermaid'

type Props = {
  content: string
}

let mermaidReady = false
let renderQueue: Promise<void> = Promise.resolve()

function renderPendingDiagrams(): Promise<void> {
  renderQueue = renderQueue
    .catch(() => undefined)
    .then(async () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>('pre.mermaid:not([data-processed])')
      )
      if (nodes.length === 0) {
        return
      }
      if (!mermaidReady) {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'antiscript',
          theme: 'dark',
          fontFamily: 'inherit',
        })
        mermaidReady = true
      }
      await mermaid.run({ nodes })
    })
  return renderQueue
}

/**
 * Draws `<pre class="mermaid">` blocks produced by the markdown pipeline.
 * This file is loaded only in the browser (next/dynamic, ssr: false) so the
 * mermaid bundle is not required during static export.
 */
export default function MermaidDiagrams({ content }: Props) {
  useEffect(() => {
    let cancelled = false
    renderPendingDiagrams().catch((error: unknown) => {
      if (!cancelled) {
        console.error('Failed to render Mermaid diagram', error)
      }
    })
    return () => {
      cancelled = true
    }
  }, [content])

  return null
}

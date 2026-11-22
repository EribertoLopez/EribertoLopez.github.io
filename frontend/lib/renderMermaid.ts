import mermaid from 'mermaid'

let initialized = false

export async function renderMermaid(): Promise<void> {
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      htmlLabels: false,
      flowchart: {
        htmlLabels: false,
      },
      themeVariables: {
        background: '#111827',
        primaryColor: '#1f2937',
        primaryTextColor: '#f9fafb',
        primaryBorderColor: '#93c5fd',
        lineColor: '#93c5fd',
        secondaryColor: '#111827',
        tertiaryColor: '#111827',
        textColor: '#f9fafb',
      },
    })
    initialized = true
  }

  await mermaid.run({
    querySelector: '.markdown-content .mermaid',
    suppressErrors: true,
  })
}

type MdNode = {
  type: string
  lang?: string | null
  value?: string
  children?: MdNode[]
}

function escapeMermaidSource(source: string): string {
  return source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function replaceMermaidFences(node: MdNode): void {
  if (!node.children) {
    return
  }

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index]
    if (child.type === 'code' && child.lang?.toLowerCase() === 'mermaid') {
      const source = escapeMermaidSource(child.value ?? '')
      node.children[index] = {
        type: 'html',
        value: `<pre class="mermaid">${source}</pre>`,
      }
      continue
    }
    replaceMermaidFences(child)
  }
}

/**
 * Turns fenced ```mermaid blocks into `<pre class="mermaid">` so a client
 * script can draw them. Other code fences are left for remark-html.
 */
export default function remarkMermaid() {
  return (tree: MdNode) => {
    replaceMermaidFences(tree)
  }
}

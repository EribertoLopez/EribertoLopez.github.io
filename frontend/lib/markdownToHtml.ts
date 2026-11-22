import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
// TODO: put into css module
const markdownLinkStyles = `      
  .markdown-content a {
      color: #0066cc;
      text-decoration: none;
      transition: all 0.3s ease;
    }
    .markdown-content a:hover {
      color: #003d7a;
      text-decoration: underline;
    }
  `
const markdownTableStyles = `      
      .markdown-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
        color: #ffffff;
        background-color: #1a1a1a;
        border: 1px solid #333333;
      }

      .markdown-content th,
      .markdown-content td {
        border: 1px solid #333333;
        padding: 16px;
        text-align: left;
        font-size: 1.1em;
      }

      .markdown-content th {
        background-color: #4d4d4d;
        color: #ffffff;
        font-weight: 500;
      }

      .markdown-content tr:nth-child(even) {
        background-color: #1a1a1a;
      }

      .markdown-content tr:nth-child(odd) {
        background-color: #222222;
      }

      /* Remove hover effect since it's not in the reference image */
      .markdown-content tr:hover {
        background-color: #333333;
      }
  `
const markdownDetailsStyles = `
      .markdown-content details {
        margin: 0.4em 0;
        padding: 0.55em 0;
        border-bottom: 1px solid #333333;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      .markdown-content details:first-of-type {
        border-top: 1px solid #333333;
      }
      .markdown-content summary {
        cursor: pointer;
        color: #ffffff;
        font-weight: 500;
        line-height: 1.45;
        padding: 0.15em 0;
      }
      .markdown-content summary::marker,
      .markdown-content summary::-webkit-details-marker {
        color: #94a3b8;
      }
      .markdown-content summary:hover {
        color: #93c5fd;
      }
      .markdown-content details[open] summary {
        margin-bottom: 0.15em;
      }
      .markdown-content details p {
        margin: 0.55em 0 0.2em;
      }
      .markdown-content details h1 {
        font-size: 1.65rem;
        margin: 1.2em 0 0.45em;
        line-height: 1.3;
      }
      .markdown-content details h2 {
        font-size: 1.4rem;
        margin: 1.15em 0 0.4em;
        line-height: 1.35;
      }
      .markdown-content details h3 {
        font-size: 1.15rem;
        margin: 0.95em 0 0.35em;
        line-height: 1.35;
      }
      .markdown-content details ul,
      .markdown-content details ol,
      .markdown-content details blockquote {
        margin: 0.5em 0;
      }
      .markdown-content details pre {
        overflow-x: auto;
        max-width: 100%;
        padding: 0.75em 1em;
        background-color: #1a1a1a;
        border: 1px solid #333333;
        -webkit-overflow-scrolling: touch;
      }
      .markdown-content details code {
        overflow-wrap: anywhere;
      }
      .markdown-content .table-scroll,
      .markdown-content details .table-scroll {
        overflow-x: auto;
        max-width: 100%;
        -webkit-overflow-scrolling: touch;
        margin: 1em 0;
      }
      .markdown-content .table-scroll table {
        margin: 0;
        width: 100%;
        min-width: 32rem;
      }
      .markdown-content th,
      .markdown-content td {
        overflow-wrap: break-word;
      }
      @media (max-width: 480px) {
        .markdown-content th,
        .markdown-content td {
          padding: 10px 12px;
          font-size: 1em;
        }
      }
      .markdown-content details .diagram-scroll {
        overflow-x: auto;
        max-width: 100%;
        -webkit-overflow-scrolling: touch;
        margin: 0.75em 0 1em;
      }
      .markdown-content details .diagram-scroll img {
        max-width: none;
        width: 1100px;
        height: auto;
        display: block;
      }
      .markdown-content details img {
        max-width: 100%;
        height: auto;
      }
      .markdown-content a.bot-card {
        display: block;
        max-width: 100%;
        margin: 1.25em 0 1.5em;
        background-color: #1a1a1a;
        border: 1px solid #333333;
        border-radius: 12px;
        overflow: hidden;
        color: #ffffff;
        text-decoration: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .markdown-content a.bot-card:hover,
      .markdown-content a.bot-card:focus {
        color: #ffffff;
        text-decoration: none;
        border-color: #93c5fd;
        box-shadow: 0 0 0 1px #93c5fd;
      }
      .markdown-content a.bot-card img {
        display: block;
        width: 100%;
        height: auto;
        aspect-ratio: 1200 / 630;
        object-fit: cover;
        background-color: #f4f4f5;
      }
      .markdown-content a.bot-card .bot-card-body {
        display: block;
        padding: 1rem 1.1rem 1.15rem;
      }
      .markdown-content a.bot-card .bot-card-title {
        display: block;
        color: #ffffff;
        font-weight: 600;
        font-size: 1.15rem;
        line-height: 1.3;
        margin-bottom: 0.4em;
      }
      .markdown-content a.bot-card .bot-card-desc {
        display: block;
        color: #cbd5e1;
        font-weight: 400;
        font-size: 0.95rem;
        line-height: 1.5;
      }
      .markdown-content a.bot-card .bot-card-cta {
        display: inline-block;
        margin-top: 0.95em;
        padding: 0.55em 1.05em;
        border-radius: 999px;
        background-color: #0066cc;
        color: #ffffff;
        font-weight: 600;
        font-size: 0.95rem;
        line-height: 1.2;
      }
      .markdown-content a.bot-card:hover .bot-card-cta,
      .markdown-content a.bot-card:focus .bot-card-cta {
        background-color: #1a7ae6;
      }
      @media (max-width: 480px) {
        .markdown-content a.bot-card .bot-card-body {
          padding: 0.85rem 0.9rem 1rem;
        }
        .markdown-content a.bot-card .bot-card-title {
          font-size: 1.05rem;
        }
        .markdown-content a.bot-card .bot-card-desc {
          font-size: 0.9rem;
        }
      }
      .markdown-content #starter-kit {
        scroll-margin-top: 1.25rem;
      }
      .markdown-content .prompt-block {
        position: relative;
        margin: 0.7em 0 1.35em;
        background-color: #1a1a1a;
        border: 1px solid #333333;
        border-radius: 10px;
        overflow: hidden;
      }
      .markdown-content .prompt-block pre {
        margin: 0;
        padding: 1em 1.15em;
        padding-right: 5.5em;
        overflow-x: auto;
        white-space: pre-wrap;
        overflow-wrap: break-word;
        user-select: all;
        -webkit-user-select: all;
        font-size: 0.92rem;
        line-height: 1.55;
        color: #e2e8f0;
        background: transparent;
        border: 0;
      }
      .markdown-content .prompt-block code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: inherit;
        color: inherit;
        background: transparent;
        overflow-wrap: break-word;
        word-break: normal;
      }
      .markdown-content .prompt-copy {
        position: absolute;
        top: 0.55em;
        right: 0.55em;
        cursor: pointer;
        border: 1px solid #333333;
        border-radius: 999px;
        background-color: #222222;
        color: #ffffff;
        font-size: 0.8rem;
        font-weight: 600;
        line-height: 1;
        padding: 0.4em 0.8em;
      }
      .markdown-content .prompt-copy:hover,
      .markdown-content .prompt-copy:focus {
        border-color: #93c5fd;
        color: #93c5fd;
      }
      @media (max-width: 480px) {
        .markdown-content .prompt-block pre {
          padding: 2.4em 0.9rem 0.9rem;
          font-size: 0.86rem;
        }
      }
  `
const markdownMermaidStyles = `
      .markdown-content .mermaid {
        margin: 1.25em 0 1.5em;
        overflow-x: auto;
        background: #111827;
        border: 1px solid #333333;
        border-radius: 10px;
        padding: 0.75em 0.5em;
      }
      .markdown-content .mermaid svg {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 0 auto;
      }
`

function mermaidBlocksToDivs(html: string): string {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_match, source: string) => `<div class="mermaid">${source.trim()}</div>`
  )
}

export default async function markdownToHtml(markdown: string) {
  // Define CSS styles for hover effect - able to override stylings of tags when rendered in the markdown-content parent div
  
  const styles = `
    <style>
      ${markdownLinkStyles}
      ${markdownTableStyles}
      ${markdownDetailsStyles}
      ${markdownMermaidStyles}
    </style>
  `

  // Create a new processor with explicit configuration
  const processor = unified()
    .use(remarkParse) // Add parser first
    .use(remarkGfm)   // Then GFM support
    .use(remarkHtml, {
      sanitize: false,
    })

const processedContent = await processor.process(markdown)
  const html = processedContent
    .toString()
    .replace(/<table>/g, '<div class="table-scroll"><table>')
    .replace(/<\/table>/g, '</table></div>')
  const withDiagrams = mermaidBlocksToDivs(html)

  // Wrap the content in a div with our class and add styles
  return `${styles}<div class="markdown-content">${withDiagrams}</div>`
}

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
export default async function markdownToHtml(markdown: string) {
  // Define CSS styles for hover effect - able to override stylings of tags when rendered in the markdown-content parent div
  
  const styles = `
    <style>
      ${markdownLinkStyles}
      ${markdownTableStyles}
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


  // Wrap the content in a div with our class and add styles
  return `${styles}<div class="markdown-content">${processedContent.toString()}</div>`
}
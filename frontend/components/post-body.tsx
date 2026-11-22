import { useEffect } from 'react'
import markdownStyles from './markdown-styles.module.css'

type Props = {
  content: string
}

const PostBody = ({ content }: Props) => {
  useEffect(() => {
    const diagrams = document.querySelectorAll('.markdown-content .mermaid')
    if (diagrams.length === 0) {
      return
    }
    // Mermaid is large, so load it only when a post contains a diagram.
    void import('../lib/renderMermaid').then(({ renderMermaid }) => renderMermaid())
  }, [content])

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={markdownStyles['markdown']}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  )
}

export default PostBody

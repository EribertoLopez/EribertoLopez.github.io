import dynamic from 'next/dynamic'
import markdownStyles from './markdown-styles.module.css'

const MermaidDiagrams = dynamic(() => import('./mermaid-diagrams'), { ssr: false })

type Props = {
  content: string
}

const PostBody = ({ content }: Props) => {
  return (
    <div className="max-w-2xl mx-auto">
      <MermaidDiagrams content={content} />
      <div
        className={markdownStyles['markdown']}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  )
}

export default PostBody

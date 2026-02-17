import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
  if (!content.trim()) {
    return null
  }

  return (
    <div
      className={cn(
        'text-xs text-muted-foreground',
        '[&_h1]:text-sm [&_h1]:font-semibold [&_h1]:text-foreground',
        '[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground',
        '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground',
        '[&_p]:leading-relaxed',
        '[&_ul]:ml-4 [&_ul]:list-disc',
        '[&_ol]:ml-4 [&_ol]:list-decimal',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5',
        '[&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2',
        '[&_a]:underline [&_a]:underline-offset-2',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

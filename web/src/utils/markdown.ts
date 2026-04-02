import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeShiki from '@shikijs/rehype';

let processor: ReturnType<typeof unified> | null = null;

async function getProcessor() {
  if (processor) return processor;
  processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeShiki, { theme: 'github-dark' })
    .use(rehypeStringify);
  return processor;
}

export async function renderMarkdown(content: string): Promise<string> {
  const proc = await getProcessor();
  const result = await proc.process(content);
  return String(result);
}

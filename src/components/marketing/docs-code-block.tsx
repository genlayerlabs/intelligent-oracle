"use client";

import { Code2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { BundledLanguage } from "shiki";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ai-elements/code-block";

interface DocsCodeBlockProps {
  code: string;
  language: BundledLanguage;
  title: string;
}

export function DocsCodeBlock({ code, language, title }: DocsCodeBlockProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="group relative w-full overflow-hidden rounded-md border bg-background text-foreground" data-language={language}>
        <div className="flex items-center justify-between border-b bg-muted/80 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Code2 className="size-4" aria-hidden />
            <span>{title}</span>
          </div>
        </div>
        <pre className="m-0 overflow-auto p-4 text-sm">
          <code className="font-mono text-sm">{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <CodeBlock code={code} language={language}>
      <CodeBlockHeader>
        <CodeBlockTitle>
          <Code2 className="size-4" aria-hidden />
          <span>{title}</span>
        </CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton />
        </CodeBlockActions>
      </CodeBlockHeader>
    </CodeBlock>
  );
}

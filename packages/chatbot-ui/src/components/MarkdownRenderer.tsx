"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
  className?: string;
};

export function MarkdownRenderer({ content, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                color: "var(--bubble-bot-text)",
                margin: "4px 0",
                lineHeight: 1.55,
              }}
            >
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong
              style={{
                color: "var(--bubble-bot-text)",
                fontWeight: 700,
              }}
            >
              {children}
            </strong>
          ),
          code: ({ className: codeClass, children, ...props }) => {
            const isBlock = codeClass?.includes("language-");
            if (isBlock) {
              return (
                <code
                  className={codeClass}
                  style={{
                    display: "block",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    background: "var(--bg-subtle)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    overflowX: "auto",
                    margin: "var(--space-2) 0",
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "var(--bg-subtle)",
                  padding: "1px 6px",
                  borderRadius: "var(--radius-xs)",
                  fontSize: 13,
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--taupe-500)",
                textDecoration: "underline",
              }}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul
              style={{
                margin: "4px 0",
                paddingLeft: 20,
                color: "var(--bubble-bot-text)",
              }}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              style={{
                margin: "4px 0",
                paddingLeft: 20,
                color: "var(--bubble-bot-text)",
              }}
            >
              {children}
            </ol>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

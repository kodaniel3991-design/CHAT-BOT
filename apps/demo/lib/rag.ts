import type { RAGConfig } from "@company/chatbot-core";
import { logChat } from "./logger";

export type RAGResult = {
  content: string;
  metadata?: Record<string, unknown>;
  score: number;
};

/**
 * Supabase pgvector 기반 RAG 검색.
 *
 * 필요 환경변수:
 * - SUPABASE_URL: Supabase 프로젝트 URL
 * - SUPABASE_SERVICE_KEY: service_role 키
 * - OPENAI_API_KEY 또는 ANTHROPIC_API_KEY: 임베딩 생성용
 *
 * Supabase에 `documents` 테이블 + `match_documents` RPC가 필요합니다.
 * (아래 SQL 참조)
 */

/**
 * 사용자 질문에 대한 관련 문서를 검색합니다.
 * RAG가 비활성화이거나 환경변수가 없으면 빈 배열을 반환합니다.
 */
export async function searchDocuments(
  query: string,
  ragConfig: RAGConfig | undefined,
): Promise<RAGResult[]> {
  if (!ragConfig?.enabled) return [];

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    logChat("warn", "rag_skip", { reason: "SUPABASE_URL or SUPABASE_SERVICE_KEY not set" });
    return [];
  }

  if (!openaiKey) {
    logChat("warn", "rag_skip", { reason: "OPENAI_API_KEY not set (needed for embeddings)" });
    return [];
  }

  try {
    // 1. 임베딩 생성 (OpenAI text-embedding-3-small)
    const embedding = await createEmbedding(query, openaiKey);

    // 2. Supabase RPC로 벡터 검색
    const results = await vectorSearch(
      supabaseUrl,
      supabaseKey,
      embedding,
      ragConfig,
    );

    logChat("info", "rag_search", {
      namespace: ragConfig.vectorDbNamespace,
      query: query.slice(0, 50),
      results: results.length,
    });

    return results;
  } catch (err) {
    logChat("warn", "rag_error", { error: String(err) });
    return [];
  }
}

/** OpenAI 임베딩 API 호출 */
async function createEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Embedding API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data[0].embedding;
}

/** Supabase RPC: match_documents */
async function vectorSearch(
  supabaseUrl: string,
  supabaseKey: string,
  embedding: number[],
  ragConfig: RAGConfig,
): Promise<RAGResult[]> {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_documents`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query_embedding: embedding,
      match_threshold: ragConfig.minScore,
      match_count: ragConfig.topK,
      filter_namespace: ragConfig.vectorDbNamespace,
    }),
  });

  if (!res.ok) {
    throw new Error(`Vector search error: ${res.status}`);
  }

  const rows = (await res.json()) as Array<{
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }>;

  return rows.map((r) => ({
    content: r.content,
    metadata: r.metadata,
    score: r.similarity,
  }));
}

/**
 * RAG 결과를 systemPrompt에 주입할 컨텍스트 문자열로 변환합니다.
 */
export function formatRAGContext(results: RAGResult[]): string {
  if (results.length === 0) return "";
  const docs = results
    .map((r, i) => `[문서 ${i + 1}] (관련도: ${(r.score * 100).toFixed(0)}%)\n${r.content}`)
    .join("\n\n");
  return `\n\n---\n참고 문서:\n${docs}\n---\n\n위 참고 문서를 바탕으로 답변하되, 문서에 없는 내용은 추측하지 마세요.`;
}

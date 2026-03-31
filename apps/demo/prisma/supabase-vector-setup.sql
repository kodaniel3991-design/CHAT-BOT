-- Supabase에서 pgvector 확장 활성화 + documents 테이블 + 검색 함수 생성
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

-- 1. pgvector 확장
create extension if not exists vector;

-- 2. 문서 테이블
create table if not exists documents (
  id bigserial primary key,
  namespace text not null,         -- 서비스별 문서 구분 (예: "esg-on-docs", "mes-on-docs")
  content text not null,           -- 문서 내용
  metadata jsonb default '{}',     -- 추가 메타데이터
  embedding vector(1536),          -- OpenAI text-embedding-3-small 차원
  created_at timestamptz default now()
);

-- 3. 벡터 인덱스 (cosine similarity)
create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. namespace 인덱스
create index if not exists documents_namespace_idx
  on documents (namespace);

-- 5. 벡터 검색 함수
create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_namespace text
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where
    d.namespace = filter_namespace
    and 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

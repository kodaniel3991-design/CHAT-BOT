import { NextResponse } from "next/server";

/** API 키 존재 여부만 노출 (값은 절대 노출하지 않음) */
export async function GET() {
  const forcePlaceholder = process.env.CHAT_USE_PLACEHOLDER_LLM === "true";
  const anthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const activeMode =
    forcePlaceholder || (!anthropic && !openai)
      ? "placeholder"
      : anthropic
        ? "anthropic"
        : "openai";

  return NextResponse.json({
    mode: activeMode,
    providers: {
      anthropicConfigured: anthropic,
      openaiConfigured: openai,
    },
    placeholderForced: forcePlaceholder,
  });
}

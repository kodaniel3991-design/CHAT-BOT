/**
 * Route Handler에서 사용자 입력 전처리 (기획서 PromptGuard).
 */
export class PromptGuard {
  private readonly dangerousPatterns: RegExp[] = [
    /ignore (all |previous )?instructions/i,
    /you are now|act as|pretend to be/i,
    /system prompt|system message/i,
    /\[INST\]|\[SYS\]/i,
  ];

  validate(input: string): { safe: boolean; reason?: string } {
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(input)) {
        return { safe: false, reason: "PROMPT_INJECTION_DETECTED" };
      }
    }
    if (input.length > 2000) {
      return { safe: false, reason: "INPUT_TOO_LONG" };
    }
    return { safe: true };
  }
}

export const promptGuard = new PromptGuard();

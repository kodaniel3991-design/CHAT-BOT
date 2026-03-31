/**
 * 서버 기동 시 한 번 실행 (Next.js instrumentation).
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.NEXTAUTH_SECRET) {
    console.warn(
      "[luon-chat] NEXTAUTH_SECRET is not set. Production deployments must set a strong secret."
    );
  }
}

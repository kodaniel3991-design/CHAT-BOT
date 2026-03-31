/** @type {import('next').NextConfig} */
const nextConfig = {
  /** `instrumentation.ts` — 프로덕션 환경 변수 경고 등 */
  experimental: {
    instrumentationHook: true,
    outputFileTracingIncludes: {
      "/api/**": ["./config/**"],
    },
  },
  transpilePackages: [
    "@company/chatbot-ui",
    "@company/chatbot-core",
    "@company/chatbot-service-kit",
  ],
};

export default nextConfig;

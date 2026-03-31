import { z } from "zod";

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid(),
  projectId: z.string().min(1).max(50),
});

export type ChatRequestPayload = z.infer<typeof ChatRequestSchema>;

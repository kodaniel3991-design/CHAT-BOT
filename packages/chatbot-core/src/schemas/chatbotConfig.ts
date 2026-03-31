import { z } from "zod";

export const ChatbotConfigSchema = z.object({
  projectId: z.string().min(1).max(50),
  llm: z.object({
    provider: z.enum(["anthropic", "openai"]),
    model: z.string().min(1),
    maxTokens: z.number().int().positive(),
    temperature: z.number().min(0).max(2),
  }),
  systemPrompt: z.string().min(1),
  conversation: z.object({
    maxHistoryLength: z.number().int().positive(),
    sessionTimeout: z.number().int().positive(),
    historyStrategy: z.enum(["sliding", "summarize"]),
    welcomeMessage: z.string().optional(),
  }),
  ui: z.object({
    theme: z.enum(["light", "dark", "auto"]),
    primaryColor: z.string().optional(),
    botName: z.string().min(1),
    botAvatarUrl: z.string().url().optional(),
    position: z.enum(["bottom-right", "bottom-left"]),
    placeholder: z.string().optional(),
    allowFileAttachment: z.boolean().optional(),
  }),
  rag: z
    .object({
      enabled: z.boolean(),
      vectorDbNamespace: z.string().min(1),
      topK: z.number().int().positive(),
      minScore: z.number().min(0).max(1),
      reranking: z.boolean().optional(),
    })
    .optional(),
  tools: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        endpoint: z.string().url().optional(),
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
        parameters: z
          .object({
            type: z.literal("object"),
            properties: z.record(
              z.object({
                type: z.enum(["string", "number", "boolean", "object", "array"]),
                description: z.string().optional(),
                enum: z.array(z.string()).optional(),
                required: z.boolean().optional(),
              }),
            ),
            required: z.array(z.string()).optional(),
          })
          .optional(),
        confirmRequired: z.boolean().optional(),
      }),
    )
    .optional(),
  features: z
    .object({
      feedback: z.boolean().optional(),
      exportHistory: z.boolean().optional(),
      fileAttachment: z.boolean().optional(),
      voiceInput: z.boolean().optional(),
      streaming: z.boolean().optional(),
    })
    .optional(),
});

export const ServiceEntrySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  config: ChatbotConfigSchema,
});

export const ServicesFileSchema = z.array(ServiceEntrySchema);

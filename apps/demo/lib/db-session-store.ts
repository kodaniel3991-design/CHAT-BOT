import type { ISessionHistoryStore, HistoryMessage, ConversationConfig } from "@company/chatbot-core";
import type { PrismaClient } from "@prisma/client";

/**
 * Supabase PostgreSQL 기반 세션 저장소.
 * Conversation 테이블에 메시지를 저장하고, sessionTimeout/maxHistoryLength를 적용합니다.
 */
export class DbSessionStore implements ISessionHistoryStore {
  constructor(
    private db: PrismaClient,
    private projectId?: string,
  ) {}

  async getMessages(
    sessionId: string,
    conversation: Pick<ConversationConfig, "sessionTimeout">,
  ): Promise<HistoryMessage[]> {
    const cutoff = new Date(Date.now() - conversation.sessionTimeout);

    const rows = await this.db.conversation.findMany({
      where: {
        sessionId,
        createdAt: { gte: cutoff },
        role: { in: ["user", "assistant"] },
      },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    return rows.map((r) => ({
      role: r.role as "user" | "assistant",
      content: r.content,
    }));
  }

  async appendUser(
    sessionId: string,
    content: string,
    conversation: Pick<ConversationConfig, "maxHistoryLength" | "sessionTimeout">,
  ): Promise<void> {
    await this.db.conversation.create({
      data: {
        sessionId,
        projectId: this.projectId ?? "unknown",
        role: "user",
        content,
      },
    });
    await this.pruneOld(sessionId, conversation);
  }

  async appendAssistant(
    sessionId: string,
    content: string,
    conversation: Pick<ConversationConfig, "maxHistoryLength" | "sessionTimeout">,
  ): Promise<void> {
    await this.db.conversation.create({
      data: {
        sessionId,
        projectId: this.projectId ?? "unknown",
        role: "assistant",
        content,
      },
    });
    await this.pruneOld(sessionId, conversation);
  }

  /** maxHistoryLength 초과 시 오래된 메시지 삭제 */
  private async pruneOld(
    sessionId: string,
    conversation: Pick<ConversationConfig, "maxHistoryLength" | "sessionTimeout">,
  ) {
    const cutoff = new Date(Date.now() - conversation.sessionTimeout);

    const all = await this.db.conversation.findMany({
      where: { sessionId, createdAt: { gte: cutoff } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (all.length > conversation.maxHistoryLength) {
      const toDelete = all.slice(0, all.length - conversation.maxHistoryLength);
      await this.db.conversation.deleteMany({
        where: { id: { in: toDelete.map((r) => r.id) } },
      });
    }
  }
}

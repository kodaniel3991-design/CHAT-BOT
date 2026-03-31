import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { ChatbotConfig } from "@company/chatbot-core";
import { ServicesFileSchema, ServiceEntrySchema } from "@company/chatbot-core";
import { createLuonServiceCatalog } from "@company/chatbot-service-kit";
import type { LuonServiceCatalog } from "@company/chatbot-service-kit";
import { logChat } from "./logger";
import type { z } from "zod";

export type ServiceEntry = z.infer<typeof ServiceEntrySchema>;

/* ─── In-memory cache ─── */
let byProjectId: Record<string, ChatbotConfig> = {};
let catalog: LuonServiceCatalog = createLuonServiceCatalog([]);
let rawEntries: ServiceEntry[] = [];

function applyEntries(entries: ServiceEntry[]) {
  rawEntries = entries;
  byProjectId = Object.fromEntries(
    entries.map((s) => [s.config.projectId, s.config]),
  );
  catalog = createLuonServiceCatalog(
    entries.map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description,
      config: s.config,
    })),
  );
}

/* ─── DB mode detection ─── */
function useDb(): boolean {
  return !!process.env.DATABASE_URL || !!process.env.DIRECT_URL;
}

/* ─── File-based (fallback) ─── */
function configPath(): string {
  return resolve(process.env.CHAT_CONFIG_PATH || "./config/services.json");
}

function loadFromFile(): boolean {
  const filePath = configPath();
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = ServicesFileSchema.parse(JSON.parse(raw));
    applyEntries(parsed);
    logChat("info", "config_loaded", { source: "file", projects: Object.keys(byProjectId) });
    return true;
  } catch (err) {
    logChat("warn", "config_load_failed", { source: "file", error: String(err) });
    return false;
  }
}

function saveToFile(entries: ServiceEntry[]) {
  writeFileSync(configPath(), JSON.stringify(entries, null, 2), "utf-8");
}

/* ─── DB-based ─── */
async function loadFromDb(): Promise<boolean> {
  try {
    const { prisma } = await import("./db");
    const rows = await prisma.service.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
    const entries: ServiceEntry[] = rows.map((r: { id: string; label: string; description: string | null; config: unknown }) => ({
      id: r.id,
      label: r.label,
      description: r.description ?? undefined,
      config: r.config as unknown as ChatbotConfig,
    }));
    applyEntries(entries);
    logChat("info", "config_loaded", { source: "db", projects: Object.keys(byProjectId) });
    return true;
  } catch (err) {
    logChat("warn", "config_load_db_failed", { error: String(err) });
    return false;
  }
}

/* ─── Initial load (file first, DB is async) ─── */
loadFromFile();

/* ─── Public API: Read ─── */
export function getChatbotConfigByProjectId(projectId: string): ChatbotConfig | null {
  return byProjectId[projectId] ?? null;
}

export function getRegisteredProjectIds(): string[] {
  return Object.keys(byProjectId);
}

export function getServiceCatalog(): LuonServiceCatalog {
  return catalog;
}

export function getAllServiceEntries(): ServiceEntry[] {
  return rawEntries;
}

export function reloadConfigs(): { ok: boolean; projects: string[] } {
  const ok = loadFromFile();
  return { ok, projects: Object.keys(byProjectId) };
}

/** 비동기 리로드 (DB 우선) */
export async function reloadConfigsAsync(): Promise<{ ok: boolean; projects: string[] }> {
  if (useDb()) {
    const ok = await loadFromDb();
    if (ok) return { ok, projects: Object.keys(byProjectId) };
  }
  // DB 실패 시 파일 폴백
  const ok = loadFromFile();
  return { ok, projects: Object.keys(byProjectId) };
}

/* ─── Public API: CRUD ─── */
export async function addServiceEntry(
  entry: ServiceEntry,
): Promise<{ ok: boolean; error?: string; projects: string[] }> {
  const existing = rawEntries.find(
    (e) => e.id === entry.id || e.config.projectId === entry.config.projectId,
  );
  if (existing) {
    return { ok: false, error: "DUPLICATE_ID", projects: Object.keys(byProjectId) };
  }

  if (useDb()) {
    try {
      const { prisma } = require("./db");
      if (!prisma) throw new Error("DB not available");
      await prisma.service.create({
        data: {
          id: entry.id,
          label: entry.label,
          description: entry.description,
          config: entry.config as object,
        },
      });
      await loadFromDb();
      logChat("info", "service_added", { id: entry.id, source: "db" });
      return { ok: true, projects: Object.keys(byProjectId) };
    } catch (err) {
      return { ok: false, error: String(err), projects: Object.keys(byProjectId) };
    }
  }

  // File fallback
  const updated = [...rawEntries, entry];
  saveToFile(updated);
  applyEntries(updated);
  logChat("info", "service_added", { id: entry.id, source: "file" });
  return { ok: true, projects: Object.keys(byProjectId) };
}

export async function updateServiceEntry(
  id: string,
  entry: ServiceEntry,
): Promise<{ ok: boolean; error?: string; projects: string[] }> {
  const idx = rawEntries.findIndex((e) => e.id === id);
  if (idx === -1) {
    return { ok: false, error: "NOT_FOUND", projects: Object.keys(byProjectId) };
  }

  if (useDb()) {
    try {
      const { prisma } = require("./db");
      if (!prisma) throw new Error("DB not available");
      await prisma.service.update({
        where: { id },
        data: {
          label: entry.label,
          description: entry.description,
          config: entry.config as object,
        },
      });
      await loadFromDb();
      logChat("info", "service_updated", { id: entry.id, source: "db" });
      return { ok: true, projects: Object.keys(byProjectId) };
    } catch (err) {
      return { ok: false, error: String(err), projects: Object.keys(byProjectId) };
    }
  }

  // File fallback
  const updated = [...rawEntries];
  updated[idx] = entry;
  saveToFile(updated);
  applyEntries(updated);
  logChat("info", "service_updated", { id: entry.id, source: "file" });
  return { ok: true, projects: Object.keys(byProjectId) };
}

export async function deleteServiceEntry(
  id: string,
): Promise<{ ok: boolean; error?: string; projects: string[] }> {
  const idx = rawEntries.findIndex((e) => e.id === id);
  if (idx === -1) {
    return { ok: false, error: "NOT_FOUND", projects: Object.keys(byProjectId) };
  }

  if (useDb()) {
    try {
      const { prisma } = require("./db");
      if (!prisma) throw new Error("DB not available");
      await prisma.service.delete({ where: { id } });
      await loadFromDb();
      logChat("info", "service_deleted", { id, source: "db" });
      return { ok: true, projects: Object.keys(byProjectId) };
    } catch (err) {
      return { ok: false, error: String(err), projects: Object.keys(byProjectId) };
    }
  }

  // File fallback
  const updated = rawEntries.filter((e) => e.id !== id);
  saveToFile(updated);
  applyEntries(updated);
  logChat("info", "service_deleted", { id, source: "file" });
  return { ok: true, projects: Object.keys(byProjectId) };
}

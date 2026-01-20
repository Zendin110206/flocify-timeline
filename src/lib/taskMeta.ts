import { HistoryLog, TaskMeta } from "./types";

const META_ACTION = "Meta";

const normalizeMeta = (meta: TaskMeta) => {
  const cleaned: TaskMeta = {};
  if (meta.initiativeId) cleaned.initiativeId = meta.initiativeId;
  if (meta.okrId) cleaned.okrId = meta.okrId;
  if (meta.milestoneId) cleaned.milestoneId = meta.milestoneId;
  return cleaned;
};

const parseMetaDetail = (detail: string): TaskMeta | null => {
  if (!detail) return null;
  try {
    const parsed = JSON.parse(detail) as TaskMeta;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // fall through
  }
  const meta: TaskMeta = {};
  detail.split(";").forEach((chunk) => {
    const [rawKey, rawValue] = chunk.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (!key || !value) return;
    if (key === "initiativeId") meta.initiativeId = value;
    if (key === "okrId") meta.okrId = value;
    if (key === "milestoneId") meta.milestoneId = value;
  });
  return Object.keys(meta).length > 0 ? meta : null;
};

export const getTaskMeta = (history?: HistoryLog[] | null): TaskMeta => {
  if (!Array.isArray(history)) return {};
  const metaLog = history.find((log) => log.action === META_ACTION);
  if (!metaLog) return {};
  const parsed = parseMetaDetail(metaLog.detail);
  return parsed ? normalizeMeta(parsed) : {};
};

const isSameMeta = (a: TaskMeta, b: TaskMeta) => {
  return (
    (a.initiativeId || null) === (b.initiativeId || null) &&
    (a.okrId || null) === (b.okrId || null) &&
    (a.milestoneId || null) === (b.milestoneId || null)
  );
};

export const upsertTaskMeta = (
  history: HistoryLog[],
  meta: TaskMeta,
  user: string,
  timestamp: string,
) => {
  const cleanedMeta = normalizeMeta(meta);
  const nextHistory = history.filter((log) => log.action !== META_ACTION);
  if (Object.keys(cleanedMeta).length === 0) return nextHistory;

  const existing = history.find((log) => log.action === META_ACTION);
  if (existing) {
    const parsed = parseMetaDetail(existing.detail) || {};
    if (isSameMeta(parsed, cleanedMeta)) return history;
  }

  const metaLog: HistoryLog = {
    id: `h-meta-${timestamp.replace(/[:.]/g, "")}`,
    user,
    action: META_ACTION,
    detail: JSON.stringify(cleanedMeta),
    timestamp,
  };
  return [...nextHistory, metaLog];
};

export const stripMetaHistory = (history?: HistoryLog[] | null) =>
  Array.isArray(history)
    ? history.filter((log) => log.action !== META_ACTION)
    : [];

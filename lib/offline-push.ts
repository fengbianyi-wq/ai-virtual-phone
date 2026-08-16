"use client";

import { ReiClient } from "@rei-standard/amsg-client";
import { REI_AMSG_POSTMESSAGE_TYPE, REI_SW_EVENT } from "@rei-standard/amsg-shared";

// 离线推送服务器配置（单用户）
export const OFFLINE_PUSH_CONFIG = {
  serverUrl: "https://float-amsg-server.2415408770.workers.dev",
  serverToken: "2a29c416256583bbce7b55863d1537a18800fd117245ee48",
  userId: "single",
};

export type OfflinePushContent = {
  sessionId?: string;
  contactName?: string;
  message?: string;
  title?: string;
  messageIndex?: number;
  totalMessages?: number;
  raw?: unknown;
};

export type OfflinePushHandler = (content: OfflinePushContent) => void;

let client: ReiClient | null = null;
let handler: OfflinePushHandler | null = null;

export function setOfflinePushHandler(fn: OfflinePushHandler | null) {
  handler = fn;
}

function toContent(payload: any): OfflinePushContent | null {
  if (!payload || typeof payload !== "object") return null;
  return {
    sessionId: payload.sessionId ?? undefined,
    contactName: payload.contactName ?? undefined,
    message: payload.message ?? payload.content ?? undefined,
    title: payload.title ?? undefined,
    messageIndex: payload.messageIndex ?? undefined,
    totalMessages: payload.totalMessages ?? undefined,
    raw: payload,
  };
}

async function drainOutbox(c: ReiClient) {
  try {
    let since: number | undefined;
    for (let i = 0; i < 5; i++) {
      const page: any = await c.getOutbox({ limit: 100, since });
      const entries = Array.isArray(page?.entries) ? page.entries : [];
      for (const entry of entries) {
        const content = toContent(entry?.push ?? entry);
        if (content) handler?.(content);
      }
      if (entries.length > 0) {
        const ids = entries.map((e: any) => e.messageId).filter(Boolean);
        if (ids.length > 0) await c.ackOutbox(ids).catch(() => {});
      }
      if (!page?.hasMore) break;
      since = page.cursor;
    }
  } catch (err) {
    console.warn("[offline-push] 收件箱补拉失败:", err);
  }
}

export async function initOfflinePush() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const c = new ReiClient({
      baseUrl: OFFLINE_PUSH_CONFIG.serverUrl,
      userId: OFFLINE_PUSH_CONFIG.userId,
      serverToken: OFFLINE_PUSH_CONFIG.serverToken,
    });
    await c.init();
    client = c;

    // 订阅 Web Push
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = await c.getVapidPublicKey();
      const subscription = await c.subscribePush(vapidPublicKey, registration);
      await c.putPushSubscription(subscription).catch(() => {});
    } catch (err) {
      console.warn("[offline-push] 推送订阅失败:", err);
    }

    // 监听 SW 广播（页面存活时实时收到）
    navigator.serviceWorker.addEventListener("message", ((e: MessageEvent) => {
      const data: any = e.data;
      if (!data || data.type !== REI_AMSG_POSTMESSAGE_TYPE) return;
      if (data.event === REI_SW_EVENT.CONTENT_RECEIVED || data.event === REI_SW_EVENT.UNKNOWN_RECEIVED || data.event === REI_SW_EVENT.RESULT_RECEIVED) {
        const content = toContent(data.payload ?? data);
        if (content) handler?.(content);
      }
    }) as EventListener);

    // 上线补一次收件箱
    await drainOutbox(c);
  } catch (err) {
    console.warn("[offline-push] 初始化失败:", err);
  }
}

export function getOfflinePushClient() {
  return client;
}

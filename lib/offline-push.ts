"use client";

import { ReiClient } from "@rei-standard/amsg-client";
import { REI_AMSG_POSTMESSAGE_TYPE, REI_SW_EVENT } from "@rei-standard/amsg-shared";
import { loadCharacters } from "@/lib/character-storage";
import { addChatContact, createOrGetSession, loadChatContacts, pushChatMessage } from "@/lib/chat-storage";

export const OFFLINE_PUSH_CONFIG = {
  serverUrl: "https://float-amsg-server.2415408770.workers.dev",
  serverToken: "2a29c416256583bbce7b55863d1537a18800fd117245ee48",
  userId: "7f4d2c9e-6b8a-4f3e-9c1d-2a5b8e0f4d6c",
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

/** 把收到的离线消息写进对应角色的聊天会话。 */
export function routeOfflineMessage(content: OfflinePushContent): boolean {
  if (!content.message?.trim()) return false;
  try {
    const chars: any[] = loadCharacters();
    const target = chars.find((c) => c.name === content.contactName || c.name === content.title);
    if (!target) return false;
    const contacts: any[] = loadChatContacts();
    let contact = contacts.find((c) => c.characterId === target.id);
    if (!contact) contact = addChatContact(target.id);
    if (!contact) return false;
    const session = createOrGetSession(contact.id);
    pushChatMessage({ sessionId: session.id, role: "assistant", content: content.message, status: "sent" });
    window.dispatchEvent(new CustomEvent("chat-message-pushed", { detail: { sessionId: session.id } }));
    return true;
  } catch (err) {
    console.warn("[offline-push] 写入聊天失败:", err);
    return false;
  }
}

/** 排一个固定文案的离线消息（无需 LLM，可用于测试推送链路）。 */
export async function scheduleOfflineMessage(opts: { contactName: string; text: string; delayMs?: number }): Promise<boolean> {
  const c = getOfflinePushClient();
  if (!c) return false;
  try {
    await c.scheduleMessage({
      contactName: opts.contactName,
      messageType: "fixed",
      userMessage: opts.text,
      firstSendTime: new Date(Date.now() + (opts.delayMs ?? 60000)).toISOString(),
      recurrenceType: "none",
    });
    return true;
  } catch (err) {
    console.warn("[offline-push] 排任务失败:", err);
    return false;
  }
}

async function drainOutbox(c: ReiClient) {
  try {
    let since: number | undefined;
    for (let i = 0; i < 5; i++) {
      const page: any = await c.getOutbox({ limit: 100, since });
      const entries = Array.isArray(page?.entries) ? page.entries : [];
      for (const entry of entries) {
        const content = toContent(entry?.push ?? entry);
        if (content) {
          const routed = routeOfflineMessage(content);
          if (!routed) handler?.(content);
        }
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

    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = await c.getVapidPublicKey();
      const subscription = await c.subscribePush(vapidPublicKey, registration);
      await c.putPushSubscription(subscription).catch(() => {});
    } catch (err) {
      console.warn("[offline-push] 推送订阅失败:", err);
    }

    navigator.serviceWorker.addEventListener("message", ((e: MessageEvent) => {
      const data: any = e.data;
      if (!data || data.type !== REI_AMSG_POSTMESSAGE_TYPE) return;
      if (data.event === REI_SW_EVENT.CONTENT_RECEIVED || data.event === REI_SW_EVENT.UNKNOWN_RECEIVED || data.event === REI_SW_EVENT.RESULT_RECEIVED) {
        const content = toContent(data.payload ?? data);
        if (content) {
          const routed = routeOfflineMessage(content);
          if (!routed) handler?.(content);
        }
      }
    }) as EventListener);

    await drainOutbox(c);
  } catch (err) {
    console.warn("[offline-push] 初始化失败:", err);
  }
}

export function getOfflinePushClient() {
  return client;
}

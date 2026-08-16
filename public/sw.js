// node_modules/@rei-standard/amsg-shared/dist/index.mjs
var TEXT_ENCODER = new TextEncoder();
var TEXT_DECODER = new TextDecoder("utf-8", { fatal: false });
function concatBytes(...chunks) {
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c instanceof Uint8Array ? c : new Uint8Array(c.buffer || c), offset);
    offset += c.byteLength;
  }
  return out;
}
function utf8(str) {
  return TEXT_ENCODER.encode(String(str));
}
function base64UrlToBytes(input) {
  const s = String(input).replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - s.length % 4) % 4;
  const padded = s + "=".repeat(pad);
  const bin = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
var LLM_MESSAGES_ERROR = Object.freeze({
  MESSAGES_NOT_ARRAY: "MESSAGES_NOT_ARRAY",
  MESSAGE_NOT_OBJECT: "MESSAGE_NOT_OBJECT",
  INVALID_ROLE: "INVALID_ROLE",
  TOOL_CALL_MALFORMED: "TOOL_CALL_MALFORMED",
  TOOL_CONTENT_INVALID: "TOOL_CONTENT_INVALID",
  TOOL_CALL_ID_MISSING: "TOOL_CALL_ID_MISSING",
  CONTENT_EMPTY_STRING: "CONTENT_EMPTY_STRING",
  CONTENT_EMPTY_ARRAY: "CONTENT_EMPTY_ARRAY",
  CONTENT_INVALID_TYPE: "CONTENT_INVALID_TYPE"
});
var UPSTREAM_ERROR_BODY_MAX_BYTES = 16 * 1024;
var KEY_INFO_PREFIX = utf8("WebPush: info\0");
var CEK_INFO = utf8("Content-Encoding: aes128gcm\0");
var NONCE_INFO = utf8("Content-Encoding: nonce\0");
var VAPID_TOKEN_LIFETIME = 12 * 3600;
var MULTIPART_MESSAGE_KIND = "_multipart";
var MULTIPART_ENCODING = "json-utf8-base64url";
var MULTIPART_VERSION = 1;
var DEFAULT_MULTIPART_TTL_MS = 6e4;
var DEFAULT_MULTIPART_MAX_CHUNKS = 128;
var DEFAULT_MULTIPART_MAX_TOTAL_BYTES = 256e3;
var REI_AMSG_POSTMESSAGE_TYPE = "REI_AMSG_PUSH";
var REI_SW_EVENT = Object.freeze({
  CONTENT_RECEIVED: "rei-amsg-content-received",
  REASONING_RECEIVED: "rei-amsg-reasoning-received",
  TOOL_REQUEST_RECEIVED: "rei-amsg-tool-request-received",
  ERROR_RECEIVED: "rei-amsg-error-received",
  /** 宿主自定义的一条结果（`messageKind: 'result'`），不是聊天内容。 */
  RESULT_RECEIVED: "rei-amsg-result-received",
  MULTIPART_EXPIRED: "rei-amsg-multipart-expired",
  UNKNOWN_RECEIVED: "rei-amsg-unknown-received"
});
var MULTIPART_FAILURE_REASON = Object.freeze({
  /** TTL 到期仍未收齐，或收到的分片本身已经过期。 */
  TTL_EXPIRED: "ttl-expired",
  /** 分片信封不合规：version / encoding 对不上、index 越界、chunk 不是合法 base64url。 */
  INVALID_CHUNK: "invalid-chunk",
  /** 同一个 id 的分片报了不一样的 total / encoding，已收的部分拼不回去。 */
  CHUNK_CONFLICT: "chunk-conflict",
  /** 累计字节数超过 maxTotalBytes。 */
  SIZE_LIMIT_EXCEEDED: "size-limit-exceeded",
  /** 收齐了但拼不回原 payload（缺片、超限、JSON 解不开）。 */
  RESTORE_FAILED: "restore-failed",
  /** 分片仓库（IndexedDB）读写失败。 */
  STORAGE_FAILED: "storage-failed",
  /** 接收端把 multipart 关了（`multipart.enabled === false`），分片没法重组。 */
  DISABLED: "disabled"
});
var REI_SW_MESSAGE_TYPE = Object.freeze({
  ENQUEUE_REQUEST: "REI_ENQUEUE_REQUEST",
  DELIVER: "REI_AMSG_DELIVER",
  FLUSH_QUEUE: "REI_FLUSH_QUEUE",
  /**
   * 入队的点对点回执：谁发的 ENQUEUE_REQUEST 就回给谁一条，一次一条。
   * 没转 MessagePort 过来时会落到全局的 `navigator.serviceWorker` message
   * 监听器上。
   */
  QUEUE_RESULT: "REI_QUEUE_RESULT",
  /**
   * 队列请求被永久拒绝、即将从队列里删掉时广播给所有窗口的一条。
   *
   * 跟 QUEUE_RESULT 分开是因为两者的收信人不是一回事：这条是广播，可能来自后台
   * `sync` 冲刷、说的也可能是另一条八竿子打不着的旧请求。共用一个 type 的话，
   * 页面等自己那条入队回执时会先收到这一条、当成自己的结果处理。
   */
  QUEUE_DROPPED: "REI_QUEUE_DROPPED"
});
var REI_AMSG_DELIVER_MESSAGE_TYPE = REI_SW_MESSAGE_TYPE.DELIVER;
var MESSAGE_KIND = Object.freeze({
  CONTENT: "content",
  REASONING: "reasoning",
  TOOL_REQUEST: "tool_request",
  ERROR: "error",
  RESULT: "result"
});
var MESSAGE_TYPE = Object.freeze({
  INSTANT: "instant",
  FIXED: "fixed",
  PROMPTED: "prompted",
  AUTO: "auto"
});
var PUSH_SOURCE = Object.freeze({
  INSTANT: "instant",
  SCHEDULED: "scheduled"
});
function notificationIntent(payload) {
  const notification = payload && typeof payload === "object" && payload.notification;
  const show = notification && typeof notification === "object" ? notification.show : void 0;
  if (show === "always") return "always";
  if (show === "when-hidden") return "when-hidden";
  if (show === false) return "never";
  if (!payload || typeof payload !== "object") return "never";
  const kind = payload.messageKind;
  if (kind === void 0 || kind === null) return "always";
  return kind === MESSAGE_KIND.CONTENT || kind === MESSAGE_KIND.RESULT ? "always" : "never";
}
var REASONING_CHUNK_ENCODER = new TextEncoder();
var REASONING_CHUNK_DECODER = new TextDecoder("utf-8", { fatal: true });

// node_modules/@rei-standard/amsg-sw/dist/index.mjs
var REI_SW_DB_NAME = "rei-sw";
var REI_SW_DB_STORE = "request-outbox";
var REI_SW_MULTIPART_STORE = "multipart-pending";
var REI_SW_MULTIPART_DONE_STORE = "multipart-done";
var REI_SW_MULTIPART_CHUNK_STORE = "multipart-chunk";
var REI_SW_DB_VERSION = 3;
var cachedDB = null;
var REI_AMSG_DEDUPE_DB_NAME = "rei_amsg_sw_dedupe_v1";
var REI_AMSG_DEDUPE_STORE = "delivery-dedupe";
var DEFAULT_DEDUPE_TTL_MS = 10 * 6e4;
var DEFAULT_DEDUPE_CLEANUP_INTERVAL_MS = 6e4;
var REI_SW_SYNC_TAG = "rei-sw-flush-request-outbox";
var DEFAULT_NOTIFICATION_BODY = "New message";
var DEFAULT_MULTIPART_OPTIONS = Object.freeze({
  enabled: true,
  ttlMs: DEFAULT_MULTIPART_TTL_MS,
  maxTotalBytes: DEFAULT_MULTIPART_MAX_TOTAL_BYTES,
  maxChunks: DEFAULT_MULTIPART_MAX_CHUNKS,
  cleanupIntervalMs: 15 * 6e4
});
var memoryMultipartPending = /* @__PURE__ */ new Map();
var memoryMultipartDone = /* @__PURE__ */ new Map();
var memoryMultipartChunks = /* @__PURE__ */ new Map();
var multipartLocks = /* @__PURE__ */ new Map();
var rejectedMultipartIds = /* @__PURE__ */ new Map();
var dedupeDbCache = /* @__PURE__ */ new Map();
function installReiSW(sw, opts = {}) {
  const defaultIcon = opts.defaultIcon || "/icon-192x192.png";
  const defaultBadge = opts.defaultBadge || "/badge-72x72.png";
  const defaultBody = opts.defaultBody || DEFAULT_NOTIFICATION_BODY;
  const multipart = normalizeMultipartOptions(opts.multipart);
  const dedupe = normalizeDedupeOptions(opts.dedupe);
  let lastMultipartCleanupAt = 0;
  let lastDedupeCleanupAt = 0;
  const makeDeliveryContext = (source) => ({
    defaultBadge,
    defaultIcon,
    defaultBody,
    dedupe,
    multipart,
    onDuplicate: opts.onDuplicate,
    onBusinessPayload: opts.onBusinessPayload,
    source,
    getLastDedupeCleanupAt: () => lastDedupeCleanupAt,
    setLastDedupeCleanupAt: (value) => {
      lastDedupeCleanupAt = value;
    },
    getLastMultipartCleanupAt: () => lastMultipartCleanupAt,
    setLastMultipartCleanupAt: (value) => {
      lastMultipartCleanupAt = value;
    }
  });
  sw.addEventListener("push", (event) => {
    const payload = readPushPayload(event);
    if (!payload) return;
    event.waitUntil(handlePushPayload(sw, payload, makeDeliveryContext("webpush")));
  });
  sw.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || typeof message !== "object") return;
    if (message.type === REI_SW_MESSAGE_TYPE.ENQUEUE_REQUEST) {
      event.waitUntil(
        enqueueAndFlush(sw, event, message.request)
      );
      return;
    }
    if (message.type === REI_SW_MESSAGE_TYPE.DELIVER) {
      event.waitUntil(handleDeliverMessage(sw, event, message, makeDeliveryContext()));
      return;
    }
    if (message.type === REI_SW_MESSAGE_TYPE.FLUSH_QUEUE) {
      event.waitUntil(flushQueuedRequests(sw));
    }
  });
  sw.addEventListener("sync", (event) => {
    if (event.tag !== REI_SW_SYNC_TAG) return;
    event.waitUntil(flushQueuedRequests(sw));
  });
}
async function handlePushPayload(sw, payload, ctx) {
  await maybeCleanupMultipart(sw, ctx);
  if (isMultipartPush(payload)) {
    if (!ctx.multipart.enabled) {
      await rejectMultipartChunk(
        sw,
        payload,
        ctx.multipart,
        MULTIPART_FAILURE_REASON.DISABLED,
        "multipart reassembly is disabled by options"
      );
      return;
    }
    const restoredPayload = await acceptMultipartChunkSafely(sw, payload, ctx.multipart);
    if (!restoredPayload) return;
    return handlePushPayload(sw, restoredPayload, ctx);
  }
  const claim = await claimDedupeSafely(payload, ctx);
  if (claim.duplicate) {
    const duplicateNotification = await maybeShowDuplicateNotification(sw, payload, claim, ctx);
    claim.duplicateNotification = duplicateNotification;
    await notifyDuplicate(payload, claim, ctx);
    const result = { ...claim, duplicateNotification };
    if (duplicateNotification && duplicateNotification.error !== void 0) {
      result.notificationError = duplicateNotification.error;
    }
    const businessError2 = await readDuplicateBusinessError(claim, ctx);
    if (businessError2 !== void 0) {
      const remainingError = await repairDuplicateBusiness(payload, claim, ctx, businessError2);
      if (remainingError !== void 0) {
        result.businessError = remainingError;
      }
    }
    return result;
  }
  const dispatchResult = await dispatchBusinessPayload(sw, payload, {
    defaultIcon: ctx.defaultIcon,
    defaultBadge: ctx.defaultBadge,
    defaultBody: ctx.defaultBody,
    onBusinessPayload: ctx.onBusinessPayload
  }, async (intermediateResult) => {
    await updateDedupeNotificationState(claim, ctx, intermediateResult);
  });
  const notificationError = dispatchResult && dispatchResult.notification ? dispatchResult.notification.error : void 0;
  if (notificationError !== void 0) {
    claim.notificationError = notificationError;
  }
  const businessError = dispatchResult ? dispatchResult.businessError : void 0;
  if (businessError !== void 0) {
    claim.businessError = businessError;
    await updateDedupeBusinessState(claim, ctx, businessError);
  }
  return claim;
}
async function handleDeliverMessage(sw, event, message, ctx) {
  let result = {};
  try {
    if (!Object.prototype.hasOwnProperty.call(message, "payload")) {
      throw new Error("[rei-standard-amsg-sw] REI_AMSG_DELIVER requires payload");
    }
    const source = typeof message.source === "string" && message.source ? message.source : "message";
    result = await handlePushPayload(sw, message.payload, { ...ctx, source }) || {};
    const ack = {
      ok: true,
      duplicate: Boolean(result.duplicate),
      key: result.key,
      requestId: message.requestId
    };
    if (result.businessError !== void 0) {
      ack.businessError = result.businessError;
    }
    if (result.dedupeError !== void 0) {
      ack.dedupeError = result.dedupeError;
    }
    if (result.notificationError !== void 0) {
      ack.notificationError = result.notificationError;
    }
    respondToSender(event, ack);
  } catch (error) {
    respondToSender(event, {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to deliver payload",
      key: result && result.key,
      requestId: message.requestId
    });
  }
}
async function dispatchBusinessPayload(sw, payload, defaults, onNotificationSettled) {
  const eventName = resolveEventName(payload);
  let clientList = [];
  try {
    clientList = await sw.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });
  } catch (_matchError) {
  }
  const notificationState = {
    shouldRender: shouldRenderNotification(payload, clientList),
    shown: false
  };
  const notificationWork = [dispatchPushToClients(sw, eventName, payload, clientList)];
  if (notificationState.shouldRender) {
    const notification = createNotificationFromPayload(payload, defaults);
    notificationWork.push(
      sw.registration.showNotification(notification.title, notification.options).then(
        () => {
          notificationState.shown = true;
        },
        (error) => {
          notificationState.error = errorToMessage(error);
          console.error("[rei-standard-amsg-sw] showNotification rejected:", error);
        }
      )
    );
  }
  let businessWork = null;
  let businessError;
  if (typeof defaults.onBusinessPayload === "function") {
    try {
      const result = defaults.onBusinessPayload(payload);
      if (result && typeof result.then === "function") {
        businessWork = Promise.resolve(result).then(
          () => {
          },
          (error) => {
            businessError = errorToMessage(error);
            console.error("[rei-standard-amsg-sw] onBusinessPayload promise rejected:", error);
          }
        );
      }
    } catch (error) {
      businessError = errorToMessage(error);
      console.error("[rei-standard-amsg-sw] onBusinessPayload error:", error);
    }
  }
  await Promise.all(notificationWork);
  const settledResult = { eventName, notification: notificationState };
  if (typeof onNotificationSettled === "function") {
    await onNotificationSettled(settledResult);
  }
  if (businessWork) await businessWork;
  settledResult.businessError = businessError;
  return settledResult;
}
function resolveEventName(payload) {
  const kind = payload && typeof payload === "object" ? payload.messageKind : void 0;
  switch (kind) {
    case MESSAGE_KIND.CONTENT:
      return REI_SW_EVENT.CONTENT_RECEIVED;
    case MESSAGE_KIND.REASONING:
      return REI_SW_EVENT.REASONING_RECEIVED;
    case MESSAGE_KIND.TOOL_REQUEST:
      return REI_SW_EVENT.TOOL_REQUEST_RECEIVED;
    case MESSAGE_KIND.ERROR:
      return REI_SW_EVENT.ERROR_RECEIVED;
    case MESSAGE_KIND.RESULT:
      return REI_SW_EVENT.RESULT_RECEIVED;
    default:
      return REI_SW_EVENT.UNKNOWN_RECEIVED;
  }
}
function shouldRenderNotification(payload, clientList) {
  const intent = notificationIntent(payload);
  if (intent === "always") return true;
  if (intent === "never") return false;
  return !clientList.some((client) => client.visibilityState === "visible");
}
async function dispatchPushToClients(sw, eventName, payload, preFetchedClientList = null) {
  return broadcastToClients(sw, {
    type: REI_AMSG_POSTMESSAGE_TYPE,
    event: eventName,
    payload
  }, preFetchedClientList);
}
async function broadcastToClients(sw, envelope, preFetchedClientList = null) {
  try {
    const clientList = preFetchedClientList || await sw.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });
    for (const client of clientList) {
      try {
        client.postMessage(envelope);
      } catch (_postError) {
      }
    }
  } catch (_matchError) {
  }
}
function readPushPayload(event) {
  if (!event.data) return null;
  try {
    return event.data.json();
  } catch (_jsonError) {
    try {
      return { message: event.data.text() };
    } catch (_textError) {
      return null;
    }
  }
}
function resolveNotificationBody(value, defaults) {
  const body = typeof value === "string" ? value : "";
  if (body.trim()) return body;
  const fallback = defaults && defaults.defaultBody;
  return typeof fallback === "string" && fallback.trim() ? fallback : DEFAULT_NOTIFICATION_BODY;
}
function createNotificationFromPayload(payload, defaults) {
  if (!payload || typeof payload !== "object") {
    return {
      title: "New notification",
      options: {
        body: resolveNotificationBody(payload == null ? "" : String(payload), defaults),
        icon: defaults.defaultIcon,
        badge: defaults.defaultBadge
      }
    };
  }
  const pushNotification = payload.notification && typeof payload.notification === "object" ? payload.notification : {};
  const title = pushNotification.title || payload.title || payload.contactName && `\u6765\u81EA ${payload.contactName}` || "New notification";
  const body = resolveNotificationBody(
    pushNotification.body || payload.body || payload.message || "",
    defaults
  );
  const data = pushNotification.data && typeof pushNotification.data === "object" ? { ...pushNotification.data } : payload.data && typeof payload.data === "object" ? { ...payload.data } : {};
  if (data.payload == null) data.payload = payload;
  return {
    title,
    options: {
      body,
      icon: pushNotification.icon || payload.icon || payload.avatarUrl || defaults.defaultIcon,
      badge: pushNotification.badge || payload.badge || defaults.defaultBadge,
      tag: pushNotification.tag || payload.tag || payload.messageId || `rei-${Date.now()}`,
      data,
      renotify: Boolean(pushNotification.renotify ?? payload.renotify ?? false),
      requireInteraction: Boolean(
        pushNotification.requireInteraction ?? payload.requireInteraction ?? false
      ),
      silent: Boolean(pushNotification.silent ?? payload.silent ?? false)
    }
  };
}
function normalizeMultipartOptions(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return {
    enabled: source.enabled !== false,
    ttlMs: positiveIntegerOrDefault(source.ttlMs, DEFAULT_MULTIPART_OPTIONS.ttlMs),
    maxTotalBytes: positiveIntegerOrDefault(
      source.maxTotalBytes,
      DEFAULT_MULTIPART_OPTIONS.maxTotalBytes
    ),
    maxChunks: positiveIntegerOrDefault(source.maxChunks, DEFAULT_MULTIPART_OPTIONS.maxChunks),
    cleanupIntervalMs: source.cleanupIntervalMs === 0 ? 0 : positiveIntegerOrDefault(
      source.cleanupIntervalMs,
      DEFAULT_MULTIPART_OPTIONS.cleanupIntervalMs
    )
  };
}
function normalizeDedupeOptions(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  if (Object.prototype.hasOwnProperty.call(source, "storeName")) {
    throw new Error(
      "[rei-standard-amsg-sw] dedupe.storeName \u4E0D\u518D\u53EF\u914D\u7F6E\u3002\u6539 storeName \u4F1A\u89E6\u53D1 IndexedDB \u7248\u672C\u5347\u7EA7\uFF0C\u672C\u5305\u4E0D\u7EF4\u62A4 migration \u903B\u8F91\u3002\u9700\u8981\u9694\u79BB\u53BB\u91CD\u6570\u636E\u8BF7\u6539\u7528 dedupe.dbName\uFF08\u6BCF\u4E2A dbName \u662F\u72EC\u7ACB IDB \u5B9E\u4F8B\uFF09\u3002"
    );
  }
  return {
    enabled: source.enabled !== false,
    ttlMs: positiveIntegerOrDefault(source.ttlMs, DEFAULT_DEDUPE_TTL_MS),
    cleanupIntervalMs: source.cleanupIntervalMs === 0 ? 0 : positiveIntegerOrDefault(
      source.cleanupIntervalMs,
      DEFAULT_DEDUPE_CLEANUP_INTERVAL_MS
    ),
    key: typeof source.key === "function" ? source.key : null,
    dbName: typeof source.dbName === "string" && source.dbName.trim() ? source.dbName.trim() : REI_AMSG_DEDUPE_DB_NAME,
    storeName: REI_AMSG_DEDUPE_STORE,
    _memoryStore: /* @__PURE__ */ new Map()
  };
}
function positiveIntegerOrDefault(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
async function claimDedupeSafely(payload, ctx) {
  try {
    return await claimDedupe(payload, ctx);
  } catch (error) {
    console.error(
      "[rei-standard-amsg-sw] dedupe claim failed; delivering as a first delivery:",
      error
    );
    const key = ctx.dedupe && ctx.dedupe.enabled !== false ? resolveDedupeKey(payload, ctx.dedupe) : void 0;
    return { duplicate: false, key, dedupeError: errorToMessage(error) };
  }
}
async function claimDedupe(payload, ctx) {
  if (!ctx.dedupe || ctx.dedupe.enabled === false) {
    return { duplicate: false, key: void 0 };
  }
  const key = resolveDedupeKey(payload, ctx.dedupe);
  if (!key) return { duplicate: false, key: void 0 };
  await maybeCleanupDedupe(ctx);
  const now = Date.now();
  const record = {
    key,
    firstSeenAt: now,
    expiresAt: now + ctx.dedupe.ttlMs,
    source: ctx.source || "unknown",
    messageKind: getPayloadMessageKind(payload),
    notificationShown: false,
    notificationStatePending: true
  };
  if (await addDedupeRecord(ctx.dedupe, record)) {
    return { duplicate: false, key, record };
  }
  const existing = await readDedupeRecord(ctx.dedupe, key);
  if (existing && existing.expiresAt <= now) {
    await deleteDedupeRecord(ctx.dedupe, key);
    if (await addDedupeRecord(ctx.dedupe, record)) {
      return { duplicate: false, key, record };
    }
  }
  return {
    duplicate: true,
    key,
    record,
    existing: existing || null
  };
}
async function updateDedupeNotificationState(claim, ctx, dispatchResult) {
  if (!claim || claim.duplicate || !claim.key || !ctx.dedupe || ctx.dedupe.enabled === false) return;
  if (claim.dedupeError !== void 0) return;
  if (!dispatchResult || !dispatchResult.notification) return;
  const notification = dispatchResult.notification;
  const next = {
    ...claim.record,
    notificationShown: notification.shown === true,
    notificationStatePending: false
  };
  try {
    await putDedupeRecord(ctx.dedupe, next);
    claim.record = next;
  } catch (error) {
    console.error("[rei-standard-amsg-sw] dedupe notification state update failed:", error);
  }
}
async function updateDedupeBusinessState(claim, ctx, businessError) {
  if (businessError === void 0) return;
  if (!claim || claim.duplicate || !claim.key || !ctx.dedupe || ctx.dedupe.enabled === false) return;
  if (claim.dedupeError !== void 0) return;
  try {
    const latest = await readDedupeRecord(ctx.dedupe, claim.key);
    if (!latest || !claim.record || latest.firstSeenAt !== claim.record.firstSeenAt) return;
    const next = { ...latest, key: claim.key, businessError };
    await putDedupeRecord(ctx.dedupe, next);
    claim.record = next;
  } catch (error) {
    console.error("[rei-standard-amsg-sw] dedupe business state update failed:", error);
  }
}
async function readDuplicateBusinessError(claim, ctx) {
  const snapshot = claim && claim.existing ? claim.existing.businessError : void 0;
  if (!ctx.dedupe || ctx.dedupe.enabled === false || !claim || !claim.key || !claim.existing) {
    return snapshot;
  }
  try {
    const latest = await readDedupeRecord(ctx.dedupe, claim.key);
    if (latest && latest.firstSeenAt === claim.existing.firstSeenAt) {
      return latest.businessError;
    }
  } catch (_readError) {
  }
  return snapshot;
}
async function repairDuplicateBusiness(payload, claim, ctx, previousError) {
  if (typeof ctx.onBusinessPayload !== "function") return previousError;
  let retryError;
  try {
    await ctx.onBusinessPayload(payload);
  } catch (error) {
    retryError = errorToMessage(error);
    console.error("[rei-standard-amsg-sw] onBusinessPayload re-run on duplicate failed:", error);
  }
  try {
    const latest = await readDedupeRecord(ctx.dedupe, claim.key);
    if (latest && claim.existing && latest.firstSeenAt === claim.existing.firstSeenAt) {
      const next = { ...latest, key: claim.key };
      if (retryError === void 0) {
        delete next.businessError;
      } else {
        next.businessError = retryError;
      }
      await putDedupeRecord(ctx.dedupe, next);
    }
  } catch (error) {
    console.error("[rei-standard-amsg-sw] dedupe business repair state update failed:", error);
  }
  return retryError;
}
async function maybeShowDuplicateNotification(sw, payload, claim, ctx) {
  const existing = claim && claim.existing ? claim.existing : null;
  if (!existing || existing.notificationShown === true) {
    return { shown: false, reason: existing ? "already-shown" : "no-existing-record" };
  }
  if (existing.notificationStatePending === true) {
    return { shown: false, reason: "first-delivery-pending" };
  }
  let clientList = [];
  try {
    clientList = await sw.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });
  } catch (_matchError) {
  }
  if (!shouldRenderNotification(payload, clientList)) {
    return { shown: false, reason: "policy-suppressed" };
  }
  const notification = createNotificationFromPayload(payload, {
    defaultIcon: ctx.defaultIcon,
    defaultBadge: ctx.defaultBadge,
    defaultBody: ctx.defaultBody
  });
  try {
    await sw.registration.showNotification(notification.title, notification.options);
  } catch (error) {
    console.error("[rei-standard-amsg-sw] duplicate showNotification rejected:", error);
    return { shown: false, reason: "show-failed", error: errorToMessage(error) };
  }
  try {
    const latest = await readDedupeRecord(ctx.dedupe, claim.key);
    const base = latest || existing;
    const next = {
      ...base,
      notificationShown: true,
      notificationStatePending: false
    };
    await putDedupeRecord(ctx.dedupe, next);
  } catch (error) {
    console.error("[rei-standard-amsg-sw] duplicate notification state update failed:", error);
  }
  return { shown: true, reason: "shown-from-duplicate" };
}
function resolveDedupeKey(payload, dedupe) {
  if (typeof dedupe.key === "function") {
    try {
      const custom = dedupe.key(payload);
      return typeof custom === "string" && custom.trim() ? custom.trim() : void 0;
    } catch (error) {
      console.error("[rei-standard-amsg-sw] dedupe.key error:", error);
      return void 0;
    }
  }
  if (!payload || typeof payload !== "object") return void 0;
  for (const field of ["messageId", "id", "dedupeKey"]) {
    const value = payload[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return void 0;
}
function getPayloadMessageKind(payload) {
  return payload && typeof payload === "object" && typeof payload.messageKind === "string" ? payload.messageKind : void 0;
}
async function notifyDuplicate(payload, claim, ctx) {
  if (typeof ctx.onDuplicate !== "function") return;
  const existing = claim.existing || {};
  const info = {
    key: claim.key,
    source: ctx.source || "unknown",
    messageKind: getPayloadMessageKind(payload),
    firstSeenAt: existing.firstSeenAt,
    existingSource: existing.source,
    existingMessageKind: existing.messageKind,
    existingNotificationShown: existing.notificationShown === true,
    duplicateNotificationShown: claim.duplicateNotification && claim.duplicateNotification.shown === true
  };
  try {
    await ctx.onDuplicate(info);
  } catch (error) {
    console.error("[rei-standard-amsg-sw] onDuplicate error:", error);
  }
}
async function maybeCleanupDedupe(ctx) {
  if (!ctx.dedupe || ctx.dedupe.enabled === false || ctx.dedupe.cleanupIntervalMs === 0) return;
  const now = Date.now();
  const last = ctx.getLastDedupeCleanupAt ? ctx.getLastDedupeCleanupAt() : 0;
  if (last && now - last < ctx.dedupe.cleanupIntervalMs) return;
  if (ctx.setLastDedupeCleanupAt) ctx.setLastDedupeCleanupAt(now);
  try {
    await cleanupDedupeStore(ctx.dedupe, now);
  } catch (error) {
    console.error("[rei-standard-amsg-sw] dedupe cleanup failed:", error);
  }
}
async function cleanupDedupeStore(dedupe, now) {
  if (!hasIndexedDB()) {
    const store = memoryDedupeStoreFor(dedupe);
    for (const [key, record] of store.entries()) {
      if (record.expiresAt <= now) store.delete(key);
    }
    return;
  }
  await withDedupeStore(dedupe, "readwrite", (store, resolve, reject) => {
    const index = store.index("expiresAt");
    const range = IDBKeyRange.upperBound(now);
    let failed = false;
    const request = index.openCursor(range);
    request.onsuccess = () => {
      if (failed) return;
      const cursor = request.result;
      if (!cursor) {
        resolve(void 0);
        return;
      }
      const deleteRequest = cursor.delete();
      deleteRequest.onsuccess = () => {
        if (failed) return;
        cursor.continue();
      };
      deleteRequest.onerror = () => {
        if (!failed) {
          failed = true;
          reject(deleteRequest.error || new Error("Failed to delete expired dedupe record"));
        }
      };
    };
    request.onerror = () => reject(request.error || new Error("Failed to scan expired dedupe records"));
  });
}
function isMultipartPush(payload) {
  return !!payload && typeof payload === "object" && payload.messageKind === MULTIPART_MESSAGE_KIND && payload.multipart && typeof payload.multipart === "object" && typeof payload.chunk === "string";
}
async function acceptMultipartChunkSafely(sw, payload, options) {
  try {
    return await acceptMultipartChunk(sw, payload, options);
  } catch (error) {
    await rejectMultipartChunk(
      sw,
      payload,
      options,
      MULTIPART_FAILURE_REASON.STORAGE_FAILED,
      error
    );
    return null;
  }
}
async function rejectMultipartChunk(sw, payload, options, reason, detail) {
  const meta = payload && typeof payload.multipart === "object" && payload.multipart ? payload.multipart : {};
  if (typeof meta.id !== "string" || !meta.id) {
    console.error(
      `[rei-standard-amsg-sw] multipart chunk rejected (${reason}):`,
      detail,
      { id: meta.id, index: meta.index, total: meta.total }
    );
    return;
  }
  const now = Date.now();
  pruneRejectedMultipartIds(now);
  if (multipartIdAlreadyRejected(meta.id, now)) return;
  rejectedMultipartIds.set(meta.id, now + rejectedMultipartIdTtlMs(options));
  console.error(
    `[rei-standard-amsg-sw] multipart chunk rejected (${reason}):`,
    detail,
    { id: meta.id, index: meta.index, total: meta.total }
  );
  await dispatchMultipartExpired(sw, {
    id: meta.id,
    total: Number.isInteger(meta.total) ? meta.total : null,
    originalMessageKind: typeof meta.originalMessageKind === "string" ? meta.originalMessageKind : null
  }, reason);
}
function rejectedMultipartIdTtlMs(options) {
  return positiveIntegerOrDefault(options && options.ttlMs, DEFAULT_MULTIPART_TTL_MS) * 2;
}
function multipartIdAlreadyRejected(id, now = Date.now()) {
  const expiresAt = rejectedMultipartIds.get(id);
  if (expiresAt === void 0) return false;
  if (expiresAt > now) return true;
  rejectedMultipartIds.delete(id);
  return false;
}
function pruneRejectedMultipartIds(now) {
  for (const [id, expiresAt] of rejectedMultipartIds) {
    if (expiresAt <= now) rejectedMultipartIds.delete(id);
  }
}
async function acceptMultipartChunk(sw, payload, options) {
  const normalized = normalizeMultipartChunk(payload, options);
  if (normalized.invalid) {
    await rejectMultipartChunk(
      sw,
      payload,
      options,
      MULTIPART_FAILURE_REASON.INVALID_CHUNK,
      normalized.invalid
    );
    return null;
  }
  const previous = multipartLocks.get(normalized.id) || Promise.resolve();
  const current = previous.catch(() => void 0).then(() => acceptMultipartChunkInternal(sw, normalized, options));
  multipartLocks.set(normalized.id, current);
  try {
    return await current;
  } finally {
    if (multipartLocks.get(normalized.id) === current) {
      multipartLocks.delete(normalized.id);
    }
  }
}
async function acceptMultipartChunkInternal(sw, normalized, options) {
  if (multipartIdAlreadyRejected(normalized.id)) return null;
  const done = await readMultipartDone(normalized.id);
  if (done && done.expiresAt > Date.now()) return null;
  if (done) await deleteMultipartDone(normalized.id);
  const now = Date.now();
  const existing = await readMultipartPending(normalized.id);
  if (existing && existing.expiresAt <= now) {
    console.error(
      "[rei-standard-amsg-sw] multipart reassembly window elapsed; giving up on this multipart id:",
      { id: existing.id, total: existing.total, receivedCount: existing.receivedCount }
    );
    await settleMultipartId(existing, existing.total, options);
    await dispatchMultipartExpired(sw, existing);
    return null;
  }
  const base = existing || {
    id: normalized.id,
    expiresAt: normalized.expiresAt,
    ttlMs: normalized.ttlMs,
    total: normalized.total,
    originalMessageKind: normalized.originalMessageKind,
    encoding: normalized.encoding,
    receivedCount: 0,
    receivedBytes: 0
  };
  if (base.total !== normalized.total || base.encoding !== normalized.encoding) {
    console.error(
      "[rei-standard-amsg-sw] multipart chunks disagree on total/encoding; giving up on this multipart id:",
      {
        id: normalized.id,
        pending: { total: base.total, encoding: base.encoding },
        incoming: { total: normalized.total, encoding: normalized.encoding }
      }
    );
    await settleMultipartId(base, Math.max(base.total, normalized.total), options);
    await dispatchMultipartExpired(sw, base, MULTIPART_FAILURE_REASON.CHUNK_CONFLICT);
    return null;
  }
  const chunkId = `${normalized.id}_${normalized.index}`;
  const chunkExists = await hasMultipartChunk(chunkId);
  if (chunkExists) return null;
  base.receivedCount++;
  base.receivedBytes = positiveIntegerOrDefault(base.receivedBytes, 0) + normalized.chunkBytes.byteLength;
  if (base.receivedBytes > options.maxTotalBytes) {
    console.error(
      "[rei-standard-amsg-sw] multipart payload exceeds maxTotalBytes; giving up on this multipart id:",
      {
        id: normalized.id,
        receivedBytes: base.receivedBytes,
        maxTotalBytes: options.maxTotalBytes
      }
    );
    await settleMultipartId(base, base.total, options);
    await dispatchMultipartExpired(sw, base, MULTIPART_FAILURE_REASON.SIZE_LIMIT_EXCEEDED);
    return null;
  }
  await writeMultipartChunk({
    id_index: chunkId,
    id: normalized.id,
    index: normalized.index,
    chunk: normalized.chunk
  });
  if (base.receivedCount < base.total) {
    await writeMultipartPending(base);
    return null;
  }
  let restored;
  try {
    restored = await restoreMultipartPayload(base, options);
  } catch (error) {
    console.error(
      "[rei-standard-amsg-sw] multipart restore failed; giving up on this multipart id:",
      error
    );
    await settleMultipartId(base, base.total, options);
    await dispatchMultipartExpired(sw, base, MULTIPART_FAILURE_REASON.RESTORE_FAILED);
    return null;
  }
  try {
    await settleMultipartId(base, base.total, options);
  } catch (error) {
    console.error(
      "[rei-standard-amsg-sw] multipart cleanup after a completed restore failed:",
      error
    );
  }
  return restored;
}
async function settleMultipartId(record, total, options) {
  const ttlMs = positiveIntegerOrDefault(record.ttlMs, options.ttlMs);
  await writeMultipartDone({
    id: record.id,
    expiresAt: Date.now() + Math.max(ttlMs * 2, ttlMs + 1)
  });
  await deleteMultipartPending(record.id);
  await deleteMultipartChunks(record.id, total);
}
function normalizeMultipartChunk(payload, options) {
  const meta = payload.multipart;
  if (!meta || typeof meta !== "object") return { invalid: "missing multipart envelope" };
  if (meta.version !== MULTIPART_VERSION) {
    return { invalid: `unsupported version ${JSON.stringify(meta.version)} (expected ${MULTIPART_VERSION})` };
  }
  if (meta.encoding !== MULTIPART_ENCODING) {
    return { invalid: `unsupported encoding ${JSON.stringify(meta.encoding)} (expected ${MULTIPART_ENCODING})` };
  }
  if (typeof meta.id !== "string" || !meta.id) return { invalid: "missing multipart id" };
  if (!Number.isInteger(meta.index) || !Number.isInteger(meta.total)) {
    return { invalid: "index and total must be integers" };
  }
  if (meta.total <= 0 || meta.total > options.maxChunks) {
    return { invalid: `total ${meta.total} out of range (maxChunks=${options.maxChunks})` };
  }
  if (meta.index <= 0 || meta.index > meta.total) {
    return { invalid: `index ${meta.index} out of range (total=${meta.total})` };
  }
  let chunkBytes;
  try {
    chunkBytes = base64UrlToBytes(payload.chunk);
  } catch (error) {
    return {
      invalid: `chunk is not valid base64url: ${error instanceof Error ? error.message : String(error)}`
    };
  }
  const now = Date.now();
  const ttlMs = Math.min(
    positiveIntegerOrDefault(meta.ttlMs, options.ttlMs),
    options.ttlMs
  );
  const expiresAt = now + ttlMs;
  return {
    id: meta.id,
    expiresAt,
    ttlMs,
    total: meta.total,
    index: meta.index,
    originalMessageKind: typeof meta.originalMessageKind === "string" ? meta.originalMessageKind : null,
    encoding: meta.encoding,
    chunk: payload.chunk,
    chunkBytes
  };
}
async function restoreMultipartPayload(record, options) {
  const chunks = [];
  let totalBytes = 0;
  for (let index = 1; index <= record.total; index++) {
    const chunkRecord = await readMultipartChunk(record.id, index);
    if (!chunkRecord || typeof chunkRecord.chunk !== "string") {
      throw new Error("[rei-standard-amsg-sw] multipart missing chunk");
    }
    const bytes = base64UrlToBytes(chunkRecord.chunk);
    totalBytes += bytes.byteLength;
    if (totalBytes > options.maxTotalBytes) {
      throw new Error("[rei-standard-amsg-sw] multipart payload exceeds maxTotalBytes");
    }
    chunks.push(bytes);
  }
  const json = new TextDecoder("utf-8", { fatal: false }).decode(concatBytes(...chunks));
  return JSON.parse(json);
}
async function maybeCleanupMultipart(sw, ctx) {
  if (!ctx.multipart.enabled) return;
  const now = Date.now();
  const last = ctx.getLastMultipartCleanupAt();
  if (last && now - last < ctx.multipart.cleanupIntervalMs) return;
  ctx.setLastMultipartCleanupAt(now);
  try {
    await cleanupMultipartStores(sw, now);
  } catch (_error) {
  }
}
async function multipartIdAlreadySettled(id, now) {
  if (multipartIdAlreadyRejected(id, now)) return true;
  const done = await readMultipartDone(id);
  return !!done && done.expiresAt > now;
}
async function cleanupMultipartStores(sw, now) {
  if (!hasIndexedDB()) {
    for (const [id, record] of memoryMultipartPending.entries()) {
      if (record.expiresAt <= now) {
        memoryMultipartPending.delete(id);
        await deleteMultipartChunks(id, record.total);
        if (await multipartIdAlreadySettled(id, now)) continue;
        await dispatchMultipartExpired(sw, record);
      }
    }
    for (const [id, record] of memoryMultipartDone.entries()) {
      if (record.expiresAt <= now) {
        memoryMultipartDone.delete(id);
      }
    }
    return;
  }
  const pendingExpired = await withDatabaseStore(REI_SW_MULTIPART_STORE, "readonly", (store, resolve, reject) => {
    const index = store.index("expiresAt");
    const range = IDBKeyRange.upperBound(now);
    const req = index.getAll(range);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  for (const record of pendingExpired) {
    await deleteStoreRecord(REI_SW_MULTIPART_STORE, record.id);
    await deleteMultipartChunks(record.id, record.total);
    if (await multipartIdAlreadySettled(record.id, now)) continue;
    await dispatchMultipartExpired(sw, record);
  }
  const doneExpiredKeys = await withDatabaseStore(REI_SW_MULTIPART_DONE_STORE, "readonly", (store, resolve, reject) => {
    const index = store.index("expiresAt");
    const range = IDBKeyRange.upperBound(now);
    if (index.getAllKeys) {
      const req = index.getAllKeys(range);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } else {
      const req = index.getAll(range);
      req.onsuccess = () => resolve((req.result || []).map((r) => r.id));
      req.onerror = () => reject(req.error);
    }
  });
  for (const id of doneExpiredKeys) {
    await deleteStoreRecord(REI_SW_MULTIPART_DONE_STORE, id);
  }
}
async function dispatchMultipartExpired(sw, record, reason = MULTIPART_FAILURE_REASON.TTL_EXPIRED) {
  await dispatchPushToClients(sw, REI_SW_EVENT.MULTIPART_EXPIRED, {
    id: record.id,
    received: typeof record.receivedCount === "number" ? record.receivedCount : 0,
    total: record.total,
    originalMessageKind: record.originalMessageKind,
    reason
  });
}
async function enqueueAndFlush(sw, event, requestPayload) {
  try {
    const request = normalizeQueuedRequest(requestPayload);
    const queueId = await addQueuedRequest(request);
    await registerFlushSync(sw);
    const outcomes = await flushQueuedRequests(sw);
    const outcome = outcomes.get(queueId);
    const ack = {
      type: REI_SW_MESSAGE_TYPE.QUEUE_RESULT,
      ok: true,
      queueId,
      delivered: Boolean(outcome && outcome.delivered)
    };
    if (outcome && outcome.dropped) {
      ack.dropped = true;
      ack.status = outcome.status;
      ack.error = outcome.error;
    }
    respondToSender(event, ack);
  } catch (error) {
    respondToSender(event, {
      type: REI_SW_MESSAGE_TYPE.QUEUE_RESULT,
      ok: false,
      error: error instanceof Error ? error.message : "Failed to queue request"
    });
  }
}
function normalizeQueuedRequest(requestPayload) {
  if (!requestPayload || typeof requestPayload !== "object") {
    throw new Error("[rei-standard-amsg-sw] `request` payload is required");
  }
  const url = typeof requestPayload.url === "string" ? requestPayload.url.trim() : "";
  if (!url) throw new Error("[rei-standard-amsg-sw] `request.url` is required");
  const method = typeof requestPayload.method === "string" ? requestPayload.method.toUpperCase() : "POST";
  const headers = normalizeHeaders(requestPayload.headers);
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? normalizeRequestBody(requestPayload.body) : void 0;
  if (hasBody && body && !hasHeader(headers, "content-type") && typeof requestPayload.body === "object") {
    headers["content-type"] = "application/json";
  }
  return {
    url,
    method,
    headers,
    body,
    createdAt: Date.now()
  };
}
function normalizeHeaders(headersInput) {
  const headers = {};
  if (!headersInput || typeof headersInput !== "object") return headers;
  for (const [key, value] of Object.entries(headersInput)) {
    if (value == null) continue;
    headers[String(key).toLowerCase()] = String(value);
  }
  return headers;
}
function hasHeader(headers, name) {
  const target = String(name || "").toLowerCase();
  return Object.prototype.hasOwnProperty.call(headers, target);
}
function normalizeRequestBody(bodyInput) {
  if (bodyInput == null) return "";
  if (typeof bodyInput === "string") return bodyInput;
  try {
    return JSON.stringify(bodyInput);
  } catch (_error) {
    throw new Error("[rei-standard-amsg-sw] request body is not serializable");
  }
}
async function flushQueuedRequests(sw) {
  const queuedRequests = await listQueuedRequests();
  const outcomes = /* @__PURE__ */ new Map();
  for (const queuedRequest of queuedRequests) {
    const outcome = await trySendQueuedRequest(queuedRequest);
    if (outcome.state === "retry") {
      await registerFlushSync(sw);
      return outcomes;
    }
    await removeQueuedRequest(queuedRequest.id);
    if (outcome.state === "dropped") {
      outcomes.set(queuedRequest.id, {
        delivered: false,
        dropped: true,
        status: outcome.status,
        error: outcome.error
      });
      await reportDroppedRequest(sw, queuedRequest, outcome);
      continue;
    }
    outcomes.set(queuedRequest.id, { delivered: true });
  }
  return outcomes;
}
async function reportDroppedRequest(sw, queuedRequest, outcome) {
  const report = {
    type: REI_SW_MESSAGE_TYPE.QUEUE_DROPPED,
    ok: false,
    queueId: queuedRequest.id,
    dropped: true,
    status: outcome.status,
    error: outcome.error,
    request: { url: queuedRequest.url, method: queuedRequest.method }
  };
  console.error("[rei-standard-amsg-sw] queued request dropped and will not be retried:", report);
  await broadcastToClients(sw, report);
}
async function trySendQueuedRequest(queuedRequest) {
  try {
    const response = await fetch(queuedRequest.url, {
      method: queuedRequest.method,
      headers: queuedRequest.headers,
      body: queuedRequest.body
    });
    if (response.ok) return { state: "sent" };
    if (response.status >= 400 && response.status < 500) {
      return {
        state: "dropped",
        status: response.status,
        error: `[rei-standard-amsg-sw] request rejected with HTTP ${response.status}`
      };
    }
    return { state: "retry" };
  } catch (_error) {
    return { state: "retry" };
  }
}
async function registerFlushSync(sw) {
  const syncManager = sw.registration && sw.registration.sync;
  if (!syncManager || typeof syncManager.register !== "function") return;
  try {
    await syncManager.register(REI_SW_SYNC_TAG);
  } catch (_error) {
  }
}
function errorToMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function respondToSender(event, message) {
  const messagePort = event.ports && event.ports[0];
  if (messagePort && typeof messagePort.postMessage === "function") {
    messagePort.postMessage(message);
    return;
  }
  const source = event.source;
  if (source && typeof source.postMessage === "function") {
    source.postMessage(message);
  }
}
async function addDedupeRecord(dedupe, record) {
  if (!hasIndexedDB()) {
    const store = memoryDedupeStoreFor(dedupe);
    if (store.has(record.key)) return false;
    store.set(record.key, cloneRecord(record));
    return true;
  }
  return withDedupeStore(dedupe, "readwrite", (store, resolve, reject) => {
    let settled = false;
    const request = store.add(record);
    request.onsuccess = () => {
      settled = true;
      resolve(true);
    };
    request.onerror = (event) => {
      settled = true;
      if (request.error && request.error.name === "ConstraintError") {
        if (event && typeof event.preventDefault === "function") event.preventDefault();
        resolve(false);
        return;
      }
      reject(request.error || new Error("Failed to add dedupe record"));
    };
    store.transaction.onerror = () => {
      if (!settled) reject(store.transaction.error || new Error("Dedupe transaction failed"));
    };
  });
}
function readDedupeRecord(dedupe, key) {
  if (!hasIndexedDB()) {
    return Promise.resolve(cloneRecord(memoryDedupeStoreFor(dedupe).get(key) || null));
  }
  return withDedupeStore(dedupe, "readonly", (store, resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Failed to read dedupe record"));
  });
}
function putDedupeRecord(dedupe, record) {
  if (!record || typeof record.key !== "string" || !record.key) {
    return Promise.resolve();
  }
  if (!hasIndexedDB()) {
    memoryDedupeStoreFor(dedupe).set(record.key, cloneRecord(record));
    return Promise.resolve();
  }
  return withDedupeStore(dedupe, "readwrite", (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve(void 0);
    request.onerror = () => reject(request.error || new Error("Failed to put dedupe record"));
  });
}
function deleteDedupeRecord(dedupe, key) {
  if (!hasIndexedDB()) {
    memoryDedupeStoreFor(dedupe).delete(key);
    return Promise.resolve();
  }
  return withDedupeStore(dedupe, "readwrite", (store, resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve(void 0);
    request.onerror = () => reject(request.error || new Error("Failed to delete dedupe record"));
  });
}
function readMultipartPending(id) {
  return readStoreRecord(REI_SW_MULTIPART_STORE, id);
}
function writeMultipartPending(record) {
  return putStoreRecord(REI_SW_MULTIPART_STORE, record);
}
function deleteMultipartPending(id) {
  return deleteStoreRecord(REI_SW_MULTIPART_STORE, id);
}
function readMultipartDone(id) {
  return readStoreRecord(REI_SW_MULTIPART_DONE_STORE, id);
}
function writeMultipartDone(record) {
  return putStoreRecord(REI_SW_MULTIPART_DONE_STORE, record);
}
function deleteMultipartDone(id) {
  return deleteStoreRecord(REI_SW_MULTIPART_DONE_STORE, id);
}
async function hasMultipartChunk(id_index) {
  if (!hasIndexedDB()) return memoryMultipartChunks.has(id_index);
  return withDatabaseStore(REI_SW_MULTIPART_CHUNK_STORE, "readonly", (store, resolve, reject) => {
    const request = store.count(id_index);
    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => reject(request.error);
  });
}
function writeMultipartChunk(record) {
  if (!hasIndexedDB()) {
    memoryMultipartChunks.set(record.id_index, cloneRecord(record));
    return Promise.resolve();
  }
  return putStoreRecord(REI_SW_MULTIPART_CHUNK_STORE, record);
}
function readMultipartChunk(id, index) {
  const id_index = `${id}_${index}`;
  if (!hasIndexedDB()) {
    return Promise.resolve(cloneRecord(memoryMultipartChunks.get(id_index) || null));
  }
  return readStoreRecord(REI_SW_MULTIPART_CHUNK_STORE, id_index);
}
async function deleteMultipartChunks(id, total) {
  if (!hasIndexedDB()) {
    for (let index = 1; index <= total; index++) {
      memoryMultipartChunks.delete(`${id}_${index}`);
    }
    return;
  }
  return withDatabaseStore(REI_SW_MULTIPART_CHUNK_STORE, "readwrite", (store, resolve, reject) => {
    let pending = total;
    let failed = false;
    for (let index = 1; index <= total; index++) {
      const request = store.delete(`${id}_${index}`);
      request.onsuccess = () => {
        if (failed) return;
        pending--;
        if (pending === 0) resolve(void 0);
      };
      request.onerror = () => {
        if (!failed) {
          failed = true;
          reject(request.error);
        }
      };
    }
    if (total === 0) resolve(void 0);
  });
}
async function readStoreRecord(storeName, id) {
  if (!hasIndexedDB()) {
    return cloneRecord(memoryStoreFor(storeName).get(id));
  }
  return withDatabaseStore(storeName, "readonly", (store, resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error(`Failed to read ${storeName}`));
  });
}
async function putStoreRecord(storeName, record) {
  if (!hasIndexedDB()) {
    memoryStoreFor(storeName).set(record.id, cloneRecord(record));
    return;
  }
  return withDatabaseStore(storeName, "readwrite", (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve(void 0);
    request.onerror = () => reject(request.error || new Error(`Failed to write ${storeName}`));
  });
}
async function deleteStoreRecord(storeName, id) {
  if (!hasIndexedDB()) {
    memoryStoreFor(storeName).delete(id);
    return;
  }
  return withDatabaseStore(storeName, "readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(void 0);
    request.onerror = () => reject(request.error || new Error(`Failed to delete ${storeName}`));
  });
}
function isConnectionClosingError(error) {
  if (!error) return false;
  if (error.name === "InvalidStateError") return true;
  const message = String(error.message || error);
  return /connection is closing|database connection is closing/i.test(message);
}
function invalidateDedupeCache(dedupe, db) {
  const cacheKey = `${dedupe.dbName}:${dedupe.storeName}`;
  const cached = dedupeDbCache.get(cacheKey);
  if (cached && cached === db) {
    try {
      cached.close();
    } catch (_closeError) {
    }
    dedupeDbCache.delete(cacheKey);
  }
}
function invalidateQueueCache(db) {
  if (cachedDB && cachedDB === db) {
    try {
      cachedDB.close();
    } catch (_closeError) {
    }
    cachedDB = null;
  }
}
async function withConnectionRetry(open, invalidate, run) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let db;
    try {
      db = await open();
    } catch (error) {
      if (attempt === 0) {
        invalidate(void 0);
        continue;
      }
      throw error;
    }
    try {
      return await run(db);
    } catch (error) {
      if (attempt === 0 && isConnectionClosingError(error)) {
        invalidate(db);
        continue;
      }
      throw error;
    }
  }
  throw new Error("[rei-standard-amsg-sw] store connection retry exhausted");
}
function withDatabaseStore(storeName, mode, handler) {
  return withConnectionRetry(openQueueDatabase, invalidateQueueCache, (db) => new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = db.transaction(storeName, mode);
    } catch (error) {
      reject(error);
      return;
    }
    const store = transaction.objectStore(storeName);
    transaction.onerror = () => reject(transaction.error || new Error("Database transaction failed"));
    Promise.resolve(handler(store, resolve, reject)).catch(reject);
  }));
}
function withDedupeStore(dedupe, mode, handler) {
  return withConnectionRetry(
    () => openDedupeDatabase(dedupe),
    (db) => invalidateDedupeCache(dedupe, db),
    (db) => new Promise((resolve, reject) => {
      let transaction;
      try {
        transaction = db.transaction(dedupe.storeName, mode);
      } catch (error) {
        reject(error);
        return;
      }
      const store = transaction.objectStore(dedupe.storeName);
      transaction.onerror = () => reject(transaction.error || new Error("Dedupe transaction failed"));
      Promise.resolve(handler(store, resolve, reject)).catch(reject);
    })
  );
}
function hasIndexedDB() {
  return typeof indexedDB !== "undefined" && indexedDB && typeof indexedDB.open === "function";
}
function memoryDedupeStoreFor(dedupe) {
  if (!dedupe._memoryStore) dedupe._memoryStore = /* @__PURE__ */ new Map();
  return dedupe._memoryStore;
}
function memoryStoreFor(storeName) {
  if (storeName === REI_SW_MULTIPART_DONE_STORE) return memoryMultipartDone;
  if (storeName === REI_SW_MULTIPART_STORE) return memoryMultipartPending;
  if (storeName === REI_SW_MULTIPART_CHUNK_STORE) return memoryMultipartChunks;
  throw new Error(`[rei-standard-amsg-sw] unknown memory store: ${storeName}`);
}
function cloneRecord(record) {
  if (record == null) return null;
  return JSON.parse(JSON.stringify(record));
}
function openDedupeDatabase(dedupe) {
  const cacheKey = `${dedupe.dbName}:${dedupe.storeName}`;
  const cached = dedupeDbCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dedupe.dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(dedupe.storeName) ? request.transaction.objectStore(dedupe.storeName) : db.createObjectStore(dedupe.storeName, { keyPath: "key" });
      if (store && !store.indexNames.contains("expiresAt")) {
        store.createIndex("expiresAt", "expiresAt", { unique: false });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      dedupeDbCache.set(cacheKey, db);
      const drop = () => {
        if (dedupeDbCache.get(cacheKey) === db) dedupeDbCache.delete(cacheKey);
      };
      db.onversionchange = () => {
        db.close();
        drop();
      };
      db.onclose = () => {
        drop();
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error("Failed to open dedupe database"));
  });
}
function openQueueDatabase() {
  if (cachedDB) return Promise.resolve(cachedDB);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(REI_SW_DB_NAME, REI_SW_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;
      createObjectStoreIfMissing(db, tx, REI_SW_DB_STORE, { keyPath: "id", autoIncrement: true });
      const mpStore = createObjectStoreIfMissing(db, tx, REI_SW_MULTIPART_STORE, { keyPath: "id" });
      const mpDoneStore = createObjectStoreIfMissing(db, tx, REI_SW_MULTIPART_DONE_STORE, { keyPath: "id" });
      createObjectStoreIfMissing(db, tx, REI_SW_MULTIPART_CHUNK_STORE, { keyPath: "id_index" });
      if (mpStore && !mpStore.indexNames.contains("expiresAt")) {
        mpStore.createIndex("expiresAt", "expiresAt", { unique: false });
      }
      if (mpDoneStore && !mpDoneStore.indexNames.contains("expiresAt")) {
        mpDoneStore.createIndex("expiresAt", "expiresAt", { unique: false });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      cachedDB = db;
      db.onversionchange = () => {
        db.close();
        if (cachedDB === db) cachedDB = null;
      };
      db.onclose = () => {
        if (cachedDB === db) cachedDB = null;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error("Failed to open queue database"));
  });
}
function createObjectStoreIfMissing(db, tx, name, options) {
  if (db.objectStoreNames.contains(name)) return tx.objectStore(name);
  return db.createObjectStore(name, options);
}
function withQueueStore(mode, handler) {
  return withConnectionRetry(openQueueDatabase, invalidateQueueCache, (db) => new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = db.transaction(REI_SW_DB_STORE, mode);
    } catch (error) {
      reject(error);
      return;
    }
    const store = transaction.objectStore(REI_SW_DB_STORE);
    transaction.oncomplete = () => resolve(void 0);
    transaction.onerror = () => reject(transaction.error || new Error("Queue transaction failed"));
    Promise.resolve(handler(store, resolve, reject)).catch(reject);
  }));
}
async function addQueuedRequest(request) {
  return withQueueStore("readwrite", (store, resolve, reject) => {
    const addRequest = store.add(request);
    addRequest.onsuccess = () => resolve(addRequest.result);
    addRequest.onerror = () => reject(addRequest.error || new Error("Failed to queue request"));
  });
}
async function listQueuedRequests() {
  return withQueueStore("readonly", (store, resolve, reject) => {
    const allRequest = store.getAll();
    allRequest.onsuccess = () => {
      const list = Array.isArray(allRequest.result) ? allRequest.result : [];
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      resolve(list);
    };
    allRequest.onerror = () => reject(allRequest.error || new Error("Failed to read queue"));
  });
}
async function removeQueuedRequest(id) {
  return withQueueStore("readwrite", (store, resolve, reject) => {
    const deleteRequest = store.delete(id);
    deleteRequest.onsuccess = () => resolve(void 0);
    deleteRequest.onerror = () => reject(deleteRequest.error || new Error("Failed to remove queued request"));
  });
}

// scripts/rei-sw-src.mjs
var CACHE_VERSION = "ai-phone-pwa-v5";
var STATIC_CACHE = `${CACHE_VERSION}-static`;
var RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
var PRECACHE_URLS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))
    )).then(() => caches.open(STATIC_CACHE)).then((cache) => cache.add(new Request("/", { cache: "reload" })).catch(() => {
    })).then(() => self.clients.claim())
  );
});
function isCacheableRequest(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  return ["font", "image", "script", "style", "worker"].includes(request.destination);
}
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await caches.match("/");
    if (fallback) return fallback;
    throw error;
  }
}
async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  if (isCacheableRequest(request)) {
    event.respondWith(cacheFirst(request));
  }
});
installReiSW(self, {
  defaultIcon: "/icon-192.png",
  defaultBadge: "/icon-192.png",
  defaultBody: "\u4F60\u6709\u65B0\u6D88\u606F"
});

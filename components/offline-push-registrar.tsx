"use client";

import { useEffect } from "react";
import { initOfflinePush, setOfflinePushHandler } from "@/lib/offline-push";

/** 启动离线推送：订阅 Web Push、监听 SW 广播、上线补收件箱。 */
export function OfflinePushRegistrar() {
  useEffect(() => {
    setOfflinePushHandler((content) => {
      // 先落本地收件箱，再广播事件（聊天模块可监听后写入对应会话）
      try {
        const key = "float-offline-push-inbox";
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        arr.push({ at: Date.now(), ...content });
        localStorage.setItem(key, JSON.stringify(arr.slice(-200)));
      } catch {}
      window.dispatchEvent(new CustomEvent("float-offline-push-message", { detail: content }));
    });

    void initOfflinePush();

    return () => {
      setOfflinePushHandler(null);
    };
  }, []);

  return null;
}

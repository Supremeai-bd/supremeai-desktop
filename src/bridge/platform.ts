import { invoke, isTauri } from "@tauri-apps/api/core";

export type Platform = "tauri" | "extension" | "web";

// Tauri v2 only exposes the legacy `window.__TAURI__` global when
// `app.withGlobalTauri` is enabled (it is not, and should not be: it widens the
// attack surface). `isTauri()` probes the `window.isTauri` flag that the Tauri
// runtime always injects, so the native branch is actually reachable.
export function detectPlatform(): Platform {
  if (typeof window !== "undefined" && isTauri()) return "tauri";
  if (typeof (globalThis as any).acquireVsCodeApi === "function") return "extension";
  return "web";
}

export interface SecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createSecureStore(): SecureStore {
  if (detectPlatform() === "tauri") {
    // Values are read and written by the Rust keystore commands
    // (see src-tauri/src/auth.rs); they never touch WebView storage.
    return {
      async get(key) {
        return (await invoke<string | null>("secure_get", { key })) ?? null;
      },
      async set(key, value) {
        await invoke("secure_set", { key, value });
      },
      async remove(key) {
        await invoke("secure_remove", { key });
      },
    };
  }
  return {
    async get(key) {
      return sessionStorage.getItem(key);
    },
    async set(key, value) {
      sessionStorage.setItem(key, value);
    },
    async remove(key) {
      sessionStorage.removeItem(key);
    },
  };
}

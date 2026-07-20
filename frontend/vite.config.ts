import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = "http://127.0.0.1:5001";

const sseProxy = {
  target: apiTarget,
  changeOrigin: true,
  secure: false,
  timeout: 0,
  proxyTimeout: 0,
  configure: (proxy: {
    on: (
      event: string,
      listener: (...args: unknown[]) => void
    ) => void;
  }) => {
    proxy.on("proxyReq", (_proxyReq, req) => {
      const request = req as { url?: string };
      if (request.url?.includes("/events/stream")) {
        (_proxyReq as { setHeader: (k: string, v: string) => void }).setHeader(
          "Accept",
          "text/event-stream"
        );
        (_proxyReq as { setHeader: (k: string, v: string) => void }).setHeader(
          "Cache-Control",
          "no-cache"
        );
      }
    });
    proxy.on("proxyRes", (proxyRes, req) => {
      const request = req as { url?: string };
      const response = proxyRes as {
        headers: Record<string, string | string[] | undefined>;
      };
      if (
        request.url?.includes("/events/stream") ||
        String(response.headers["content-type"] || "").includes("text/event-stream")
      ) {
        delete response.headers["content-length"];
        response.headers["cache-control"] = "no-cache, no-transform";
        response.headers["connection"] = "keep-alive";
        response.headers["x-accel-buffering"] = "no";
      }
    });
    proxy.on("error", (err, _req, res) => {
      const response = res as { writeHead?: (code: number) => void; end?: () => void } | undefined;
      if (response?.writeHead && !("headersSent" in response && (response as { headersSent?: boolean }).headersSent)) {
        response.writeHead(502);
        response.end?.();
      }
      // ECONNRESET is normal when the backend restarts or the tab closes.
      void err;
    });
  },
};

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api/events/stream": sseProxy,
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
        timeout: 0,
        proxyTimeout: 0,
      },
      "/uploads": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

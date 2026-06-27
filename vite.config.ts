import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

const rawPort = process.env.PORT || "3001";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

function apiMiddlewarePlugin(): Plugin {
  return {
    name: "api-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith("/api/")) {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const apiPath = url.pathname;

          // Parse body if POST/PUT
          let body: any = {};
          if (req.method === "POST" || req.method === "PUT") {
            const buffers: Buffer[] = [];
            for await (const chunk of req) {
              buffers.push(chunk as Buffer);
            }
            const rawBody = Buffer.concat(buffers).toString("utf-8");
            try {
              body = JSON.parse(rawBody);
            } catch {
              body = {};
            }
          }

          // Mock VercelRequest & VercelResponse
          const mockReq: any = {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body,
            query: Object.fromEntries(url.searchParams),
          };

          const mockRes: any = {
            statusCode: 200,
            headers: {},
            setHeader(name: string, value: string) {
              this.headers[name] = value;
              res.setHeader(name, value);
            },
            status(code: number) {
              this.statusCode = code;
              res.statusCode = code;
              return this;
            },
            json(data: any) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(data));
              return this;
            },
            send(data: any) {
              res.end(data);
              return this;
            }
          };

          try {
            // Load local environment variables from .env.local if not already in process.env
            const envPath = path.resolve(import.meta.dirname, ".env.local");
            if (fs.existsSync(envPath)) {
              const lines = fs.readFileSync(envPath, "utf-8").split("\n");
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
                  const [key, val] = trimmed.split("=", 2);
                  const envKey = key.trim();
                  if (!process.env[envKey]) {
                    process.env[envKey] = val.trim().replace(/^['"]|['"]$/g, "");
                  }
                }
              }
            }

            if (apiPath === "/api/cache") {
              const handlerPath = path.resolve(import.meta.dirname, "api/cache.ts");
              const handler = (await server.ssrLoadModule(handlerPath)).default;
              await handler(mockReq, mockRes);
            } else if (apiPath === "/api/ingest") {
              const handlerPath = path.resolve(import.meta.dirname, "api/ingest.ts");
              const handler = (await server.ssrLoadModule(handlerPath)).default;
              await handler(mockReq, mockRes);
            } else {
              res.statusCode = 404;
              res.end("Not Found");
            }
          } catch (err: any) {
            console.error("API route error:", err);
            res.statusCode = 500;
            res.end(err.message || "Internal Server Error");
          }
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    apiMiddlewarePlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import "express-async-errors";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const backendEnvPath = path.resolve(__dirname, "../.env");
const repoRootEnvPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: fs.existsSync(backendEnvPath) ? backendEnvPath : repoRootEnvPath });


const app = express();

// Behind Render/NGINX proxies.
app.set("trust proxy", 1);

const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "refergrow-backend" });
});

async function main() {
  const { registerRoutes } = await import("./routes");
  registerRoutes(app);

  // Always return JSON for unknown routes.
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Central error handler (incl. async route errors via express-async-errors).
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    if (res.headersSent) return;

    const message =
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err instanceof Error
          ? err.message
          : String(err);

    res.status(500).json({ error: message });
  });

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`ReferGrow API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

# Deployment & Troubleshooting Guide

Diese Dokumentation sammelt alle wichtigen Erkenntnisse und Lösungen für das Deployment dieser TanStack Start-Anwendung auf Render.com.

## Inhaltsverzeichnis

1. [TanStack Start POST + Middleware + Body Bug](#tanstack-start-post--middleware--body-bug)
2. [Build-Probleme](#build-probleme)
3. [TypeScript-Fehler](#typescript-fehler)
4. [Server-Deployment](#server-deployment)
5. [Statische Assets](#statische-assets)
6. [Wichtige Konfigurationen](#wichtige-konfigurationen)

---

## TanStack Start POST + Middleware + Body Bug

### Problem

Wenn eine Server Function mit `POST`-Methode und Middleware verwendet wird, ist der Request Body (`data`) im Handler `null` oder `undefined`, obwohl der Client die Daten korrekt sendet.

### Ursache

TanStack Start parst den Request Body **nach** der Middleware-Ausführung, wenn kein `inputValidator` verwendet wird. Die Middleware erhält daher keinen Zugriff auf die Request-Daten.

### Lösung

Verwende `inputValidator` mit `zodValidator` **vor** der Middleware:

```typescript
import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const schema = z.object({
  message: z.string().min(1).max(10000),
  model: z.enum(["gpt-oss-120b", "Mistral-Small-3.2-24B-Instruct"]).optional(),
});

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(schema)) // ← WICHTIG: Vor Middleware!
  .middleware([verifyAccessToInstance])
  .handler(async ({ data, context }) => {
    // data ist jetzt korrekt geparst und validiert
    console.log("Data:", data); // ✅ Funktioniert!
  });
```

### Weitere Details

Siehe auch: `docs/TANSTACK_START_POST_MIDDLEWARE_BUG.md`

---

## Build-Probleme

### Problem 1: Doppelter Import

**Fehler:**
```
SyntaxError: Identifier 'createServerFileRoute' has already been declared. (2:9)
```

**Ursache:**
Die Datei `src/routes/api/webhooks.mittwald.ts` hatte zwei Imports:
```typescript
import { createServerFileRoute } from "@tanstack/react-start/server"
import { createServerFileRoute } from "@tanstack/start-server-core";
```

**Lösung:**
Nur einen Import verwenden:
```typescript
// @ts-expect-error - createServerFileRoute is available at runtime but not in types
import { createServerFileRoute } from "@tanstack/react-start/server";
```

### Problem 2: Prisma 7 Breaking Changes

**Fehler:**
```
Error: The datasource property `url` is no longer supported in schema files.
Type 'string' is not assignable to type 'SqlDriverAdapterFactory'.
```

**Ursache:**
Prisma 7 hat die Konfiguration geändert. Die `url` Property darf nicht mehr im `schema.prisma` stehen, und `adapter` wird nicht mehr unterstützt.

**Lösung:**

1. **Entferne `url` aus `prisma/schema.prisma`:**
```prisma
datasource db {
  provider = "postgresql"
  // url wird NICHT mehr hier definiert
}
```

2. **Entferne `adapter` aus `src/db.ts`:**
```typescript
const createPrismaClient = () =>
  new PrismaClient({
    // adapter: env.DATABASE_URL, ← ENTFERNEN!
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }).$extends(...)
```

3. **DATABASE_URL wird automatisch aus der Umgebung gelesen** - keine zusätzliche Konfiguration nötig.

### Problem 3: Route Tree Generation

**Fehler:**
```
Could not load /path/to/src/routeTree.gen.ts (imported by src/router.tsx): Crawling result not available
```

**Ursache:**
Der Router-Generator konnte die Route-Dateien nicht parsen, weil Syntax-Fehler vorhanden waren (z.B. doppelte Imports).

**Lösung:**
1. Alle Syntax-Fehler in Route-Dateien beheben
2. Build-Cache löschen: `rm -rf .tanstack node_modules/.vite .vite`
3. Build erneut ausführen

---

## TypeScript-Fehler

### Problem 1: StartClient API-Änderung

**Fehler:**
```
Property 'router' does not exist on type 'IntrinsicAttributes'.
```

**Lösung:**
`StartClient` benötigt keinen `router` Prop mehr - der Router wird automatisch geladen:

```typescript
// ❌ FALSCH
import { getRouter } from "./router";
const router = getRouter();
hydrateRoot(document, <StartClient router={router} />);

// ✅ RICHTIG
hydrateRoot(document, <StartClient />);
```

### Problem 2: Middleware API-Änderung

**Fehler:**
```
Object literal may only specify known properties, and 'validateClient' does not exist
Object literal may only specify known properties, and 'data' does not exist
```

**Lösung:**
Entferne `validateClient` und explizite `data`-Weitergabe:

```typescript
// ❌ FALSCH
export const verifyAccessToInstance = createMiddleware({
  type: "function",
  validateClient: true, // ← ENTFERNEN
})
  .client(async ({ next, data }) => {
    return next({
      data: data, // ← NICHT NÖTIG
      sendContext: { ... },
    });
  })

// ✅ RICHTIG
export const verifyAccessToInstance = createMiddleware({
  type: "function",
})
  .client(async ({ next }) => {
    return next({
      sendContext: { ... },
    });
  })
```

### Problem 3: Zod Error API

**Fehler:**
```
Property 'errors' does not exist on type 'ZodError<unknown>'.
```

**Lösung:**
Verwende `error.issues` statt `error.errors`:

```typescript
// ❌ FALSCH
if (error instanceof z.ZodError) {
  const errorMsg = `Validation error: ${error.errors.map(e => e.message).join(", ")}`;
}

// ✅ RICHTIG
if (error instanceof z.ZodError) {
  const errorMsg = `Validation error: ${error.issues.map(e => e.message).join(", ")}`;
}
```

### Problem 4: Server Function Call

**Fehler:**
```
Property 'data' is missing in type '{ message: string; ... }'
```

**Lösung:**
Wrappe die Daten in `{ data: ... }`:

```typescript
// ❌ FALSCH
const result = await sendChatMessage(payload);

// ✅ RICHTIG
const result = await sendChatMessage({ data: payload });
```

### Problem 5: import.meta.env

**Fehler:**
```
Property 'env' does not exist on type 'ImportMeta'.
```

**Lösung:**
Verwende `process.env.NODE_ENV` statt `import.meta.env.DEV`:

```typescript
// ❌ FALSCH
{typeof window !== "undefined" && import.meta.env.DEV && (
  <DevTools />
)}

// ✅ RICHTIG
{typeof window !== "undefined" && process.env.NODE_ENV === "development" && (
  <DevTools />
)}
```

---

## Server-Deployment

### Problem: Server startet nicht

**Fehler:**
```
Error: Cannot find module '/opt/render/project/src/.output/server/index.mjs'
Application exited early
```

**Ursache:**
TanStack Start erstellt die Server-Datei in `dist/server/server.js`, nicht in `.output/server/index.mjs`. Außerdem exportiert TanStack Start einen Fetch-Handler, keinen HTTP-Server.

**Lösung:**

1. **Erstelle einen HTTP-Server-Wrapper** (`server.mjs`):

```javascript
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import server from "./dist/server/server.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT) || 10000;
const host = process.env.HOST || "0.0.0.0";

// Content-Type mapping für statische Assets
const contentTypes = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  // ... weitere Types
};

const httpServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
    
    // Statische Assets servieren
    if (url.pathname.startsWith("/assets/")) {
      try {
        const filePath = join(__dirname, "dist/client", url.pathname);
        const fileContent = await readFile(filePath);
        const ext = extname(url.pathname);
        const contentType = contentTypes[ext] || "application/octet-stream";
        
        res.statusCode = 200;
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.end(fileContent);
        return;
      } catch (error) {
        // File not found, continue to TanStack Start handler
      }
    }
    
    // Request Body lesen
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = chunks.length > 0 ? Buffer.concat(chunks) : null;
    }
    
    // TanStack Start Fetch-Handler aufrufen
    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers,
      body: body,
    });

    const response = await server.fetch(request);
    
    // Response zurücksenden
    res.statusCode = response.status;
    res.statusMessage = response.statusText;
    
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    
    res.end();
  } catch (error) {
    console.error("Server error:", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

httpServer.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
```

2. **Aktualisiere `package.json`:**
```json
{
  "scripts": {
    "start": "node server.mjs"
  }
}
```

---

## Statische Assets

### Problem: 404-Fehler für Assets

**Fehler:**
```
Failed to load resource: the server responded with a status of 404 ()
main-CwPgtHnt.js
index-7OmSSG_X.js
```

**Ursache:**
Der HTTP-Server-Wrapper servierte keine statischen Assets aus `dist/client/assets/`.

**Lösung:**
Siehe Server-Deployment Abschnitt - der Wrapper serviert jetzt Assets aus `dist/client/assets/` mit korrekten Content-Types und Cache-Headern.

---

## Wichtige Konfigurationen

### Vite Config

```typescript
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
    host: "0.0.0.0", // Wichtig für Render!
  },
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      customViteReactPlugin: true, // ← WICHTIG!
    }),
    react(), // ← Muss NACH tanstackStart() kommen!
  ],
});
```

### Render.com Konfiguration (`render.yaml`)

```yaml
services:
  - type: web
    name: mittwald-gpt
    env: node
    plan: starter
    buildCommand: pnpm install && pnpm db:generate && pnpm build
    startCommand: pnpm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: mittwald-gpt-db
          property: connectionString
      # ... weitere Env-Vars
    healthCheckPath: /
    autoDeploy: true
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "pnpm db:generate && vite build && tsc --noEmit",
    "start": "node server.mjs",
    "db:generate": "prisma generate"
  }
}
```

---

## Checkliste für Deployment

- [ ] Alle TypeScript-Fehler behoben
- [ ] Build läuft erfolgreich durch (`pnpm build`)
- [ ] `server.mjs` existiert und ist korrekt konfiguriert
- [ ] `package.json` Start-Befehl zeigt auf `server.mjs`
- [ ] Prisma Schema kompatibel mit Prisma 7
- [ ] `inputValidator` für POST-Requests mit Middleware verwendet
- [ ] Statische Assets werden serviert
- [ ] Environment-Variablen in Render konfiguriert
- [ ] Datenbank-Migrationen ausgeführt (`pnpm db:migrate:deploy`)

---

## Häufige Probleme und Quick Fixes

### Build schlägt fehl wegen Route-Parsing

```bash
rm -rf .tanstack node_modules/.vite .vite
pnpm build
```

### Server startet nicht

1. Prüfe, ob `dist/server/server.js` existiert
2. Prüfe, ob `server.mjs` existiert
3. Prüfe `package.json` Start-Befehl

### Assets werden nicht geladen

1. Prüfe, ob `dist/client/assets/` existiert
2. Prüfe Server-Logs für 404-Fehler
3. Prüfe, ob `server.mjs` Assets serviert

### Daten kommen nicht im Handler an

1. Verwende `inputValidator` vor Middleware
2. Prüfe Client-Aufruf: `sendChatMessage({ data: payload })`
3. Prüfe Middleware: Keine explizite `data`-Weitergabe nötig

---

## Weitere Ressourcen

- [TanStack Start Dokumentation](https://tanstack.com/start/latest)
- [Prisma 7 Migration Guide](https://www.prisma.io/docs/guides/migrate-to-prisma-7)
- [Render.com Dokumentation](https://render.com/docs)

---

**Letzte Aktualisierung:** 2025-12-04


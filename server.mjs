import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import server from "./dist/server/server.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT) || 10000;
const host = process.env.HOST || "0.0.0.0";

// Content-Type mapping
const contentTypes = {
	".js": "application/javascript",
	".mjs": "application/javascript",
	".css": "text/css",
	".html": "text/html",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".eot": "application/vnd.ms-fontobject",
};

const httpServer = createServer(async (req, res) => {
	try {
		const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
		
		// Serve static assets from dist/client
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
				console.error("Static file not found:", url.pathname, error.message);
			}
		}
		
		// Read request body if present
		let body = null;
		if (req.method !== "GET" && req.method !== "HEAD") {
			const chunks = [];
			for await (const chunk of req) {
				chunks.push(chunk);
			}
			body = chunks.length > 0 ? Buffer.concat(chunks) : null;
		}
		
		const request = new Request(url.toString(), {
			method: req.method,
			headers: req.headers,
			body: body,
		});

		const response = await server.fetch(request);
		
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


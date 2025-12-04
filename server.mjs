import { createServer } from "node:http";
import server from "./dist/server/server.js";

const port = Number(process.env.PORT) || 10000;
const host = process.env.HOST || "0.0.0.0";

const httpServer = createServer(async (req, res) => {
	try {
		const url = `http://${req.headers.host || `${host}:${port}`}${req.url}`;
		const request = new Request(url, {
			method: req.method,
			headers: req.headers,
			body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
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


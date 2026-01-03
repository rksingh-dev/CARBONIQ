import { createServer } from "./server/index";

export default {
    async fetch(request: Request, env: any, ctx: any) {
        const url = new URL(request.url);

        // 1. Serve Static Assets (if using Workers Assets binding)
        // If headers/method indicate asset, or if using `env.ASSETS.fetch`
        if (env.ASSETS) {
            try {
                const asset = await env.ASSETS.fetch(request);
                if (asset.status < 400) {
                    return asset;
                }
            } catch (e) {
                // Fallback to API
            }
        }

        // 2. Handle API Requests (Express Adapter)
        // Only intercept /api/ requests or fallback for SPA routing if not found?
        // Actually, usually assets take precedence.

        // We reuse the adapter logic
        return handleExpress(request, env, ctx);
    },
};

async function handleExpress(request: Request, env: any, ctx: any) {
    const app = createServer();

    // Inject Env
    if (env) {
        // Safely copy env vars to process.env for the Express app
        // Note: In strict environments this might be read-only, 
        // but usually process.env is polyfilled in nodejs_compat.
        for (const key in env) {
            if (typeof env[key] === 'string') {
                process.env[key] = env[key];
            }
        }
    }

    let body: any = null;
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
        try { body = await request.json(); } catch { }
    } else if (contentType?.includes("text")) {
        try { body = await request.text(); } catch { }
    }

    return new Promise((resolve) => {
        const req: any = {
            url: request.url,
            path: new URL(request.url).pathname,
            method: request.method,
            headers: Object.fromEntries(request.headers),
            query: Object.fromEntries(new URL(request.url).searchParams),
            body,
            header: (n: string) => request.headers.get(n),
            get: (n: string) => request.headers.get(n),
        };

        const res: any = {
            statusCode: 200,
            headers: new Headers(),
            _headers: {},
            setHeader(name: string, value: string) {
                this.headers.set(name, value);
                this._headers[name.toLowerCase()] = value;
            },
            getHeader(name: string) { return this._headers[name.toLowerCase()]; },
            status(code: number) { this.statusCode = code; return this; },
            json(data: any) {
                this.setHeader("Content-Type", "application/json");
                resolve(new Response(JSON.stringify(data), { status: this.statusCode, headers: this.headers }));
            },
            send(data: any) {
                resolve(new Response(data, { status: this.statusCode, headers: this.headers }));
            },
            end(data: any) {
                resolve(new Response(data, { status: this.statusCode, headers: this.headers }));
            },
            write() { },
        };

        (app as any).handle(req, res, (err: any) => {
            if (err) {
                resolve(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
            } else {
                resolve(new Response("Not Found", { status: 404 }));
            }
        });
    });
}

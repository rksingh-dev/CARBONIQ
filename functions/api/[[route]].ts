import { createServer } from "../../server";
import { Buffer } from "buffer";

// Adapter to bridge Cloudflare Pages Functions (Request) -> Express (req, res)
export const onRequest: PagesFunction = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);

    // Initialize Express App
    // Note: We create it per request to ensure isolation, or we could cache it.
    const app = createServer();

    // Configure environment from context if needed (Secrets)
    if (env) {
        Object.assign(process.env, env);
    }

    // Parse Body if needed
    let body: any = null;
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
        try {
            body = await request.json();
        } catch { }
    } else if (contentType?.includes("text")) {
        body = await request.text();
    }

    // Create a Promise to wait for the Express response
    return new Promise(async (resolve) => {
        // MOCK REQUEST (IncomingMessage)
        const req: any = {
            url: url.pathname + url.search,
            path: url.pathname,
            method: request.method,
            query: Object.fromEntries(url.searchParams),
            headers: Object.fromEntries(request.headers),
            body: body,
            header: (name: string) => request.headers.get(name),
            get: (name: string) => request.headers.get(name),
        };

        // MOCK RESPONSE (ServerResponse)
        const res: any = {
            statusCode: 200,
            headers: new Headers(),
            _headers: {},
            getHeader: (name: string) => res._headers[name.toLowerCase()],
            setHeader: (name: string, value: string) => {
                res._headers[name.toLowerCase()] = value;
                res.headers.set(name, value);
            },
            status: (code: number) => {
                res.statusCode = code;
                return res;
            },
            json: (data: any) => {
                res.setHeader("Content-Type", "application/json");
                resolve(
                    new Response(JSON.stringify(data), {
                        status: res.statusCode,
                        headers: res.headers,
                    })
                );
            },
            send: (data: any) => {
                resolve(
                    new Response(data, {
                        status: res.statusCode,
                        headers: res.headers,
                    })
                );
            },
            end: (data: any) => {
                resolve(
                    new Response(data, {
                        status: res.statusCode,
                        headers: res.headers,
                    })
                );
            },
            // Basic streaming support (often unused in simple APIs)
            write: () => { },
        };

        // Forward to Express
        try {
            // app.handle is the internal method to dispatch request
            app.handle(req, res, (err: any) => {
                if (err) {
                    console.error("Express Error:", err);
                    resolve(
                        new Response(JSON.stringify({ error: err.message }), {
                            status: 500,
                            headers: { "Content-Type": "application/json" },
                        })
                    );
                } else {
                    // 404 handled by Express if we reach here usually, but if not:
                    resolve(new Response("Not Found", { status: 404 }));
                }
            });
        } catch (e: any) {
            resolve(
                new Response(JSON.stringify({ error: e.message }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                })
            );
        }
    });
};

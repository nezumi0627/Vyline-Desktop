import { resolve, sep } from "node:path";

const root = resolve(import.meta.dir, process.argv[2] ?? ".");
const port = Number(process.env.PORT ?? 4173);

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const relativePath = decodeURIComponent(
      url.pathname === "/" ? "index.html" : url.pathname.slice(1),
    );
    const candidate = resolve(root, relativePath);

    if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
      return new Response("Forbidden", { status: 403 });
    }

    const file = Bun.file(candidate);
    if (await file.exists()) return new Response(file);
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Vyline landing page: http://127.0.0.1:${server.port}`);

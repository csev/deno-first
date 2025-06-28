import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";

const app = new Hono();
const kv = await Deno.openKv();

// Get a book by title
app.get("/kv/get/:key{.*}", async (c) => {
  const key = c.req.param("key");
  const result = await kv.get(key.split('/'));
  return c.json(result);
});


// Create a book (POST body is JSON)
app.post("/kv/set/:key{.*}", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  const result = await kv.set(key.split('/'), body);
  return c.json(result);
});

Deno.serve(app.fetch);

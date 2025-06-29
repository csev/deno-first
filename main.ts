import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";

const app = new Hono();
const kv = await Deno.openKv();

// Basic KV operations to support admim interface

// Get a record by key
app.get("/kv/get/:key{.*}", async (c) => {
  const key = c.req.param("key");
  const result = await kv.get(key.split('/'));
  return c.json(result);
});

// List records with a key prefix
app.get("/kv/list/:key{.*}", async (c) => {
  const key = c.req.param("key");
  const cursor = c.req.query("cursor");
  const extra = {'limit': 100};
  if ( typeof cursor == 'string' && cursor.length > 0 ) {
    extra['cursor'] = cursor;
  }
  const iter = await kv.list({ prefix: key.split('/') }, extra );
  const records = [];
  for await (const entry of iter) {
    records.push(entry);
  }
  console.log('iter', iter.cursor);
  return c.json({'records': records, 'cursor': iter.cursor});
});

// Set a record by key (POST body is JSON)
app.post("/kv/set/:key{.*}", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  const result = await kv.set(key.split('/'), body);
  return c.json(result);
});

// Delete a record
app.delete("/kv/delete/:key{.*}", async (c) => {
  const key = c.req.param("key");
  const result = await kv.delete(key.split('/'));
  return c.json(result);
});

// Full database reset
app.delete("/kv/full_reset_42", async (c) => {
  const iter = await kv.list({ prefix: [] });
  const keys = [];
  for await (const entry of iter) {
    kv.delete(entry.key);
    keys.push(entry);
  }
  console.log("Database reset keys deleted:", len(keys));
  return c.json({'keys': keys});
});

app.all('/dump/*', async (c) => {
  const req = c.req

  // Request details
  const method = req.method
  const url = req.url
  const path = req.path
  const query = req.query()
  const headers: Record<string, string> = {}
  for (const [key, value] of req.raw.headers.entries()) {
    headers[key] = value
  }

  // Try to parse body as JSON, otherwise fallback to text
  let body: any = null
  try {
    body = await req.json()
  } catch {
    try {
      body = await req.text()
    } catch {
      body = null
    }
  }

  const dump = {
    method,
    url,
    path,
    headers,
    query,
    body,
  }

  return c.json(dump, 200)
});

Deno.serve(app.fetch);

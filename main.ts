import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";

const app = new Hono();
const kv = await Deno.openKv();

// Get a record by key
app.get("/kv/get/:key{.*}", async (c) => {
  const key = c.req.param("key");
  const result = await kv.get(key.split('/'));
  return c.json(result);
});

// List records with a key prefix
app.get("/kv/list/:key{.*}", async (c) => {
  const key = c.req.param("key");
  const iter = await kv.get({ prefix: key.split('/') });
  const records = [];
  for await (const entry of iter) {
    records.push(entry);
    console.log(entry.key);
    console.log(entry.value);
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

Deno.serve(app.fetch);

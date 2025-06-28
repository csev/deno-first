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
  console.log("list key", key);
  const iter = await kv.list({ prefix: key.split('/') }, {'limit': 1} );
  console.log('iter return', iter);
  const records = [];
  for await (const entry of iter) {
    console.log(entry);
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

Deno.serve(app.fetch);

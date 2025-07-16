import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { HTTPException } from "https://deno.land/x/hono@v3.12.10/http-exception.ts";

const app = new Hono();
const kv = await Deno.openKv();

// Basic KV operations to support admin interface

// Set a record by key (POST body is JSON)
// https://pg4e-deno-kv-api-10.deno.dev/set/books/Hamlet?key=123
app.post("/kv/set/:key{.*}", async (c) => {
  console.log("set");
  const token = checkToken(c);
  console.log("token", token);
  const key = c.req.param("key");
  console.log("key", key);
  const body = await c.req.json();
  console.log(body);
  var karr = key.split('/');
  console.log("karr 1", karr);
  karr.unshift('student', token);
  console.log("karr 2", karr);
  const result = await kv.set(karr, body);
  console.log("result", result);
  return c.json(result);
});

// Get a record by key
// https://pg4e-deno-kv-api-10.deno.dev/get/books/Hamlet?key=123
app.get("/kv/get/:key{.*}", async (c) => {
  const token = checkToken(c);
  const key = c.req.param("key");
  var karr = key.split('/');
  karr.unshift('student', token);
  const result = await kv.get(karrr);
  return c.json(result);
});

// List records with a key prefix
// https://pg4e-deno-kv-api-10.deno.dev/list/books
app.get("/kv/list/:key{.*}", async (c) => {
  const token = checkToken(c);
  const key = c.req.param("key");
  var karr = key.split('/');
  karr.unshift('student', token);
  const cursor = c.req.query("cursor");
  const extra = {'limit': 100};
  if ( typeof cursor == 'string' && cursor.length > 0 ) {
    extra['cursor'] = cursor;
  }
  const iter = await kv.list({ prefix: karr }, extra );
  const records = [];
  for await (const entry of iter) {
    records.push(entry);
  }
  return c.json({'records': records, 'cursor': iter.cursor});
});

// Delete a record
// https://pg4e-deno-kv-api-10.deno.dev/delete/books/Hamlet?key=123
app.delete("/kv/delete/:key{.*}", async (c) => {
  const token = checkToken(c);
  const key = c.req.param("key");
  var karr = key.split('/');
  karr.unshift('student', token);
  const result = await kv.delete(karr);
  return c.json(result);
});

// Delete a prefix
// https://pg4e-deno-kv-api-10.deno.dev/delete/books/nonfiction?key=123
app.delete("/kv/delete_prefix/:key{.*}", async (c) => {
  const token = checkToken(c);
  const key = c.req.param("key");
  var karr = key.split('/');
  karr.unshift('student', token);
  const iter = await kv.list({ prefix: karr });
  const keys = [];
  for await (const entry of iter) {
    kv.delete(entry.key);
    keys.push(entry.key);
  }
  console.log("Keys with prefix", key, "deleted:", keys.length);
  return c.json({'keys': keys});
});

// Full database reset
// https://pg4e-deno-kv-api-10.deno.dev/full_reset_42?key=123
app.delete("/kv/full_reset_42", async (c) => {
  const token = checkToken(c);
  const iter = await kv.list({ prefix: [] });
  const keys = [];
  for await (const entry of iter) {
    kv.delete(entry.key);
    keys.push(entry);
  }
  console.log("Database reset keys deleted:", keys.length);
  return c.json({'keys': keys});
});

// Dump the request object for learning and debugging
// https://pg4e-deno-kv-api-10.deno.dev/dump/stuff/goes_here?key=123
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

  console.log('Dump headers', headers);

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

// Insure security
function checkToken(c) {
  const token = c.req.query("token");
  if ( token == '42' ) return token;
  
  throw new HTTPException(401, { message: 'Missing or invalid token' }); 
}

// Make sure we return the correct HTTP Status code when we throw an exception
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.text(err.message, err.status);
  }
  return c.text('Internal Server Error', 500);
});

Deno.serve(app.fetch);

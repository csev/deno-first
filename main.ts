import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { HTTPException } from "https://deno.land/x/hono@v3.12.10/http-exception.ts";
// import { createHash } from "jsr:@std/hash/mod";
import { encodeHex } from "jsr:@std/encoding/hex";

const app = new Hono();
const kv = await Deno.openKv();

// Basic KV operations to support admin interface

// Set a record by key (POST body is JSON)
// https://pg4e-deno-kv-api-10.deno.dev/set/books/Hamlet?key=123
app.post("/kv/set/:key{.*}", async (c) => {
  const token = checkToken(c);
  const key = c.req.param("key");
  const body = await c.req.json();
  var karr = key.split('/');
  karr.unshift('student', token);
  const result = await kv.set(karr, body);
  return c.json(result);
});

// Get a record by key
// https://pg4e-deno-kv-api-10.deno.dev/get/books/Hamlet?key=123
app.get("/kv/get/:key{.*}", async (c) => {
  const token = checkToken(c);
  const key = c.req.param("key");
  var karr = key.split('/');
  karr.unshift('student', token);
  var result = await kv.get(karr);
  result.key.shift();
  result.key.shift();
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
    entry.key.shift();
    entry.key.shift();
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
  // Date three months from now
  // 2025-10-16T03:15:18.917Z
  let d = new Date(new Date().setMonth(new Date().getMonth() + 3));
  console.log(d, typeof d);
  let ds = d.toISOString();
  console.log(ds, typeof ds);
  // 2510 (year / month)
  let expire = ds.substring(2,4) + ds.substring(5,7);
  console.log(expire);

  let user = "abc123";
  let secret = "12345";

  let plain = user + '_' + expire + '_' + secret;
  console.log(plain);

  let md5 = createHash("md5").update(plain).toString();
  console.log('md5', md5);

  if ( token == '42' ) return token;
  
  throw new HTTPException(401, { message: 'Missing or invalid token' }); 
}

// Make sure we return the correct HTTP Status code when we throw an exception
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.text(err.message, err.status);
  }
  console.error(err);
  return c.text('Internal Server Error', 500);
});

Deno.serve(app.fetch);

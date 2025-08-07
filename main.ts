import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { HTTPException } from "https://deno.land/x/hono@v3.12.10/http-exception.ts";
import { crypto } from "jsr:@std/crypto";
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
  let karr = key.split('/');
  karr.unshift('student', token);
  const result = await kv.set(karr, body);
  return c.json(result);
});

// Get a record by key
// https://pg4e-deno-kv-api-10.deno.dev/get/books/Hamlet?key=123
app.get("/kv/get/:key{.*}", async (c) => {
  const token = checkToken(c);
  const key = c.req.param("key");
  let karr = key.split('/');
  karr.unshift('student', token);
  let result = await kv.get(karr);
  result.key.shift();
  result.key.shift();
  return c.json(result);
});

// List records with a key prefix
// https://pg4e-deno-kv-api-10.deno.dev/list/books
app.get("/kv/list/:key{.*}", async (c) => {
  const token = checkToken(c);
  const key = c.req.param("key");
  let karr = key.split('/');
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
  let karr = key.split('/');
  karr.unshift('student', token);
  const result = await kv.delete(karr);
  return c.json(result);
});

// Delete a prefix
// https://pg4e-deno-kv-api-10.deno.dev/delete/books/nonfiction?key=123
app.delete("/kv/delete_prefix/:key{.*}", async (c) => {
  const token = checkToken(c);
  const key = c.req.param("key");
  let karr = key.split('/');
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

// https://stackoverflow.com/a/33486055/1994792
let MD5 = function(d){var r = M(V(Y(X(d),8*d.length)));return r.toLowerCase()};function M(d){for(var _,m="0123456789ABCDEF",f="",r=0;r<d.length;r++)_=d.charCodeAt(r),f+=m.charAt(_>>>4&15)+m.charAt(15&_);return f}function X(d){for(var _=Array(d.length>>2),m=0;m<_.length;m++)_[m]=0;for(m=0;m<8*d.length;m+=8)_[m>>5]|=(255&d.charCodeAt(m/8))<<m%32;return _}function V(d){for(var _="",m=0;m<32*d.length;m+=8)_+=String.fromCharCode(d[m>>5]>>>m%32&255);return _}function Y(d,_){d[_>>5]|=128<<_%32,d[14+(_+64>>>9<<4)]=_;for(var m=1732584193,f=-271733879,r=-1732584194,i=271733878,n=0;n<d.length;n+=16){var h=m,t=f,g=r,e=i;f=md5_ii(f=md5_ii(f=md5_ii(f=md5_ii(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_ff(f=md5_ff(f=md5_ff(f=md5_ff(f,r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+0],7,-680876936),f,r,d[n+1],12,-389564586),m,f,d[n+2],17,606105819),i,m,d[n+3],22,-1044525330),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+4],7,-176418897),f,r,d[n+5],12,1200080426),m,f,d[n+6],17,-1473231341),i,m,d[n+7],22,-45705983),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+8],7,1770035416),f,r,d[n+9],12,-1958414417),m,f,d[n+10],17,-42063),i,m,d[n+11],22,-1990404162),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+12],7,1804603682),f,r,d[n+13],12,-40341101),m,f,d[n+14],17,-1502002290),i,m,d[n+15],22,1236535329),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+1],5,-165796510),f,r,d[n+6],9,-1069501632),m,f,d[n+11],14,643717713),i,m,d[n+0],20,-373897302),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+5],5,-701558691),f,r,d[n+10],9,38016083),m,f,d[n+15],14,-660478335),i,m,d[n+4],20,-405537848),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+9],5,568446438),f,r,d[n+14],9,-1019803690),m,f,d[n+3],14,-187363961),i,m,d[n+8],20,1163531501),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+13],5,-1444681467),f,r,d[n+2],9,-51403784),m,f,d[n+7],14,1735328473),i,m,d[n+12],20,-1926607734),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+5],4,-378558),f,r,d[n+8],11,-2022574463),m,f,d[n+11],16,1839030562),i,m,d[n+14],23,-35309556),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+1],4,-1530992060),f,r,d[n+4],11,1272893353),m,f,d[n+7],16,-155497632),i,m,d[n+10],23,-1094730640),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+13],4,681279174),f,r,d[n+0],11,-358537222),m,f,d[n+3],16,-722521979),i,m,d[n+6],23,76029189),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+9],4,-640364487),f,r,d[n+12],11,-421815835),m,f,d[n+15],16,530742520),i,m,d[n+2],23,-995338651),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+0],6,-198630844),f,r,d[n+7],10,1126891415),m,f,d[n+14],15,-1416354905),i,m,d[n+5],21,-57434055),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+12],6,1700485571),f,r,d[n+3],10,-1894986606),m,f,d[n+10],15,-1051523),i,m,d[n+1],21,-2054922799),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+8],6,1873313359),f,r,d[n+15],10,-30611744),m,f,d[n+6],15,-1560198380),i,m,d[n+13],21,1309151649),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+4],6,-145523070),f,r,d[n+11],10,-1120210379),m,f,d[n+2],15,718787259),i,m,d[n+9],21,-343485551),m=safe_add(m,h),f=safe_add(f,t),r=safe_add(r,g),i=safe_add(i,e)}return Array(m,f,r,i)}function md5_cmn(d,_,m,f,r,i){return safe_add(bit_rol(safe_add(safe_add(_,d),safe_add(f,i)),r),m)}function md5_ff(d,_,m,f,r,i,n){return md5_cmn(_&m|~_&f,d,_,r,i,n)}function md5_gg(d,_,m,f,r,i,n){return md5_cmn(_&f|m&~f,d,_,r,i,n)}function md5_hh(d,_,m,f,r,i,n){return md5_cmn(_^m^f,d,_,r,i,n)}function md5_ii(d,_,m,f,r,i,n){return md5_cmn(m^(_|~f),d,_,r,i,n)}function safe_add(d,_){var m=(65535&d)+(65535&_);return(d>>16)+(_>>16)+(m>>16)<<16|65535&m}function bit_rol(d,_){return d<<_|d>>>32-_}

function getExpireNow() {
  // 2025-07-16T03:15:18.917Z
  let d = new Date();
  let ds = d.toISOString();
  // 2507 (year / month)
  let expirenow = ds.substring(2,4) + ds.substring(5,7);
  return expirenow;
}

// Four month ago
function getExpireOld() {
// Date four months ago
    let d = new Date(new Date().setMonth(new Date().getMonth() - 4));
    let ds = d.toISOString();
    let expireold = ds.substring(2,4) + ds.substring(5,7);
    return expireold;
}

// Insure security
function checkToken(c) {
  const token = c.req.query("token");
  if ( token.size < 10 ) {
    console.log('Token format incorrect', token);
    throw new HTTPException(401, { message: 'Incorrect token format' }); 
  }

  let expirenow = getExpireNow();
  let expiretoken = token.substring(0,4);
  if (expirenow > expiretoken) {
      console.log('Token expired', token, expirenow);
      throw new HTTPException(401, { message: 'Token expired' });
  }

  let tokenarr = token.split(':')
  if ( tokenarr.length != 2 ) {
      console.log('Token format incorrect', token, tokenarr);
      throw new HTTPException(401, { message: 'Token format incorrect' });
  }
  
  let secret = "42";

  let plain = tokenarr[0] + ':' + secret;
  let md5 = MD5(plain).substring(0,6);
  let computed = tokenarr[0] + ':' + md5;
  if ( computed == token ) return token;
  
  console.log("Token invalid", computed, token);
  throw new HTTPException(401, { message: 'Token invalid' });
}

// Make sure we return the correct HTTP Status code when we throw an exception
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.text(err.message, err.status);
  }
  console.error(err);
  return c.text('Internal Server Error', 500);
});

// If you are putting up your own server you can either delete this
// CRON entry or change it to be once per month with "0 0 1 * *" as
// the CRON string
Deno.cron("Hourly DB Reset", "0 * * * *", async () => {
  const ckv = await Deno.openKv();
  const expirebefore = getExpireOld();
  const iter = await ckv.list({ prefix: [ 'student' ] });
  const keys = [];
  let count = 0;
  for await (const entry of iter) {
    if ( entry.key.length < 2 ) continue;
    if ( entry.key[0] != 'student' ) continue;
    // console.log('entry.key[1]', entry.key[1]);
    const keyprefix = entry.key[1].substring(0,4);
    if ( keyprefix >= expirebefore ) {
      // console.log('Not expiring', expirebefore, keyprefix, entry.key);
      continue;
    }
    console.log('Expiring', expirebefore, keyprefix, entry.key);
    ckv.delete(entry.key);
    count++;
    if ( count < 10 ) keys.push(entry.key);
  }
  console.log("Hourly reset keys deleted:", count, keys);
});

Deno.serve(app.fetch);

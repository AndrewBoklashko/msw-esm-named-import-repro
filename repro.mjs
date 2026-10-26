// `request` imported by name from `node:https` in an ES module (as e.g. aws-jwt-verify's ESM
// build does) bypasses MSW until something calls the patched `https.request` first.
// `node repro.mjs --sync` calls module.syncBuiltinESMExports() after server.listen().
import https, { request } from 'node:https';
import { syncBuiltinESMExports } from 'node:module';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('https://example.test/data', () => HttpResponse.json({ intercepted: true })),
);
server.listen({ onUnhandledRequest: 'error' });
if (process.argv.includes('--sync')) syncBuiltinESMExports();

const get = (label, fn) =>
  new Promise((resolve) => {
    fn('https://example.test/data', (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve(console.log(label, body)));
    })
      .on('error', (error) => resolve(console.log(label, error.code ?? error.message)))
      .end();
  });

await get('1. named import          :', request);
await get('2. default https.request :', (...args) => https.request(...args));
await get('3. named import again    :', request);
server.close();

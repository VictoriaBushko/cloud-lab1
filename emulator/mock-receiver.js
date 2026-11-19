const http = require('http');

const apiKey = process.env.API_KEY || 'dev-key';
const required = ['sensor_id', 'sensor_type', 'value', 'unit', 'location', 'measured_at'];
let accepted = 0;
let rejected = 0;

http
  .createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/ingest') {
      res.writeHead(404);
      return res.end();
    }
    if (req.headers['x-api-key'] !== apiKey) {
      rejected++;
      res.writeHead(401);
      return res.end();
    }
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        if (required.every((key) => key in message)) {
          accepted++;
          res.writeHead(202);
          return res.end();
        }
      } catch {}
      rejected++;
      res.writeHead(400);
      res.end();
    });
  })
  .listen(8080, () => console.log('mock receiver on :8080'));

setInterval(() => console.log(`accepted=${accepted} rejected=${rejected}`), 5000);
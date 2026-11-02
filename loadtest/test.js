import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const cacheHit = new Rate('cache_hit_ratio');

export const options = {
  stages: [
    { duration: '3m', target: 60 },
    { duration: '5m', target: 60 },
    { duration: '2m', target: 0 },
  ],
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
};

const readParams = {
  headers: __ENV.NOCACHE ? { 'Cache-Control': 'no-cache' } : {},
  tags: { name: 'GET /api/products/:id' },
};

const read = (url) => {
  const res = http.get(url, readParams);
  check(res, { 'read 200': (r) => r.status === 200 });
  if (!__ENV.NOCACHE) {
    cacheHit.add(res.headers['X-Cache'] === 'HIT');
  }
};

export default function () {
  const base = __ENV.BASE_URL;
  const body = JSON.stringify({
    type: 'ruby',
    title: 'Load test ' + __VU + '-' + __ITER,
    carat: 1.5,
    price: 5000,
  });
  const created = http.post(base + '/api/products', body, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /api/products' },
  });
  const ok = check(created, { 'created 201': (r) => r.status === 201 });
  if (!ok) {
    return;
  }

  const id = created.json('id');
  read(base + '/api/products/' + id);

  for (let i = 1; i <= 8; i++) {
    read(base + '/api/products/' + Math.max(1, id - i));
  }
}
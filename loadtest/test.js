import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '3m', target: 60 },
    { duration: '5m', target: 60 },
    { duration: '2m', target: 0 },
  ],
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
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
  });
  const ok = check(created, { 'created 201': (r) => r.status === 201 });
  if (!ok) {
    return;
  }

  const id = created.json('id');
  const own = http.get(base + '/api/products/' + id);
  check(own, { 'own product 200': (r) => r.status === 200 });

  for (let i = 1; i <= 8; i++) {
    const other = Math.max(1, id - i);
    const res = http.get(base + '/api/products/' + other);
    check(res, { 'read 200': (r) => r.status === 200 });
  }
}

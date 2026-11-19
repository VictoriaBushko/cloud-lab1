const crypto = require('crypto');
const { query, ensureSchema, toDbTime, fromDbTime } = require('./db');

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const keysMatch = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

exports.handler = async (event) => {
  const provided = event.headers && event.headers['x-api-key'];
  if (!provided || !keysMatch(provided, process.env.API_KEY)) {
    return reply(401, { error: 'invalid api key' });
  }

  const sensorId = event.pathParameters && event.pathParameters.sensor_id;
  const params = event.queryStringParameters || {};
  const conditions = ['sensor_id = ?'];
  const values = [sensorId];

  for (const [name, operator] of [['from', '>='], ['to', '<=']]) {
    if (params[name] !== undefined) {
      if (!ISO_UTC.test(params[name]) || Number.isNaN(Date.parse(params[name]))) {
        return reply(400, { error: `${name} must be a UTC time in ISO 8601 format` });
      }
      conditions.push(`measured_at ${operator} ?`);
      values.push(toDbTime(params[name]));
    }
  }

  let limit = 100;
  if (params.limit !== undefined) {
    limit = Number(params.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      return reply(400, { error: 'limit must be an integer from 1 to 1000' });
    }
  }

  try {
    await ensureSchema();
    const rows = await query(
      'SELECT sensor_id, sensor_type, measured_at, `value`, unit, lat, lon, status, note ' +
        'FROM measurements WHERE ' +
        conditions.join(' AND ') +
        ' ORDER BY measured_at DESC LIMIT ?',
      [...values, limit]
    );
    return reply(
      200,
      rows.map((row) => ({
        sensor_id: row.sensor_id,
        sensor_type: row.sensor_type,
        value: row.value,
        unit: row.unit,
        location: { lat: row.lat, lon: row.lon },
        measured_at: fromDbTime(row.measured_at),
        status: row.status,
        note: row.note,
      }))
    );
  } catch (err) {
    console.error('history query failed', err);
    return reply(500, { error: 'internal error' });
  }
};
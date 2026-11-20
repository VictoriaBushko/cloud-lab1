const crypto = require('crypto');
const { query, ensureSchema, toDbTime, fromDbTime } = require('./db');
const { queryRaw } = require('./raw');
const { readUrl, READ_TTL_SEC } = require('./images');

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

const withImage = async (item, objectKey) => {
  if (!objectKey) return item;
  return { ...item, object_key: objectKey, image_url: await readUrl(objectKey), image_url_expires_in: READ_TTL_SEC };
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

  const source = params.source === undefined ? 'sql' : params.source;
  if (source !== 'sql' && source !== 'nosql') {
    return reply(400, { error: 'source must be sql or nosql' });
  }

  if (source === 'nosql') {
    try {
      const items = await queryRaw(sensorId, params.from, params.to, limit);
      const result = await Promise.all(
        items.map((it) =>
          withImage(
            {
              sensor_id: it.sensor_id,
              sensor_type: it.sensor_type,
              value: it.value,
              unit: it.unit,
              location: it.location,
              measured_at: it.measured_at,
              source: 'nosql',
            },
            it.object_key
          )
        )
      );
      return reply(200, result);
    } catch (err) {
      console.error('nosql query failed', err);
      return reply(500, { error: 'internal error' });
    }
  }

  try {
    await ensureSchema();
    const rows = await query(
      'SELECT sensor_id, sensor_type, measured_at, `value`, unit, lat, lon, status, note, object_key ' +
        'FROM measurements WHERE ' +
        conditions.join(' AND ') +
        ' ORDER BY measured_at DESC LIMIT ?',
      [...values, limit]
    );
    const result = await Promise.all(
      rows.map((row) =>
        withImage(
          {
            sensor_id: row.sensor_id,
            sensor_type: row.sensor_type,
            value: row.value,
            unit: row.unit,
            location: { lat: row.lat, lon: row.lon },
            measured_at: fromDbTime(row.measured_at),
            status: row.status,
            note: row.note,
          },
          row.object_key
        )
      )
    );
    return reply(200, result);
  } catch (err) {
    console.error('history query failed', err);
    return reply(500, { error: 'internal error' });
  }
};
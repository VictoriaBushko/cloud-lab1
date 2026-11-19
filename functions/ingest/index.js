const crypto = require('crypto');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const sqs = new SQSClient({});
const ssm = new SSMClient({});

const SENSOR_TYPES = ['temperature', 'humidity', 'light'];
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

let cachedKey;

const getApiKey = async () => {
  if (!cachedKey) {
    const res = await ssm.send(
      new GetParameterCommand({ Name: process.env.API_KEY_PARAM, WithDecryption: true })
    );
    cachedKey = res.Parameter.Value;
  }
  return cachedKey;
};

const keysMatch = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const isText = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

const validate = (m) => {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return 'body must be a JSON object';
  if (!isText(m.sensor_id, 64)) return 'sensor_id is required';
  if (!SENSOR_TYPES.includes(m.sensor_type)) {
    return `sensor_type must be one of ${SENSOR_TYPES.join(', ')}`;
  }
  if (!isNumber(m.value)) return 'value must be a number';
  if (!isText(m.unit, 16)) return 'unit is required';
  const loc = m.location;
  if (!loc || !isNumber(loc.lat) || loc.lat < -90 || loc.lat > 90) {
    return 'location.lat must be a number between -90 and 90';
  }
  if (!isNumber(loc.lon) || loc.lon < -180 || loc.lon > 180) {
    return 'location.lon must be a number between -180 and 180';
  }
  if (
    typeof m.measured_at !== 'string' ||
    !ISO_UTC.test(m.measured_at) ||
    Number.isNaN(Date.parse(m.measured_at))
  ) {
    return 'measured_at must be a UTC time in ISO 8601 format';
  }
  return null;
};

exports.handler = async (event) => {
  let expected;
  try {
    expected = await getApiKey();
  } catch (err) {
    console.error('api key lookup failed', err);
    return reply(500, { error: 'internal error' });
  }

  const provided = event.headers && event.headers['x-api-key'];
  if (!provided || !keysMatch(provided, expected)) {
    return reply(401, { error: 'invalid api key' });
  }

  let message;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    message = JSON.parse(raw);
  } catch {
    return reply(400, { error: 'invalid JSON' });
  }

  const error = validate(message);
  if (error) {
    return reply(400, { error });
  }

  const clean = {
    sensor_id: message.sensor_id,
    sensor_type: message.sensor_type,
    value: message.value,
    unit: message.unit,
    location: { lat: message.location.lat, lon: message.location.lon },
    measured_at: message.measured_at,
  };

  let sent;
  try {
    sent = await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: JSON.stringify(clean),
      })
    );
  } catch (err) {
    console.error('queue send failed', err);
    return reply(500, { error: 'queue unavailable' });
  }

  return reply(202, { status: 'accepted', message_id: sent.MessageId });
};
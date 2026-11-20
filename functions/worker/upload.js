const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({});
const SENSOR_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_SIZE = 1048576;
const TTL_SEC = 300;
const CONTENT_TYPE = 'image/png';

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

  let body;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    body = JSON.parse(raw);
  } catch {
    return reply(400, { error: 'invalid JSON' });
  }
  if (!body || typeof body.sensor_id !== 'string' || !SENSOR_ID.test(body.sensor_id)) {
    return reply(400, { error: 'sensor_id is required (letters, digits, - and _)' });
  }
  if (!Number.isInteger(body.size) || body.size < 1 || body.size > MAX_SIZE) {
    return reply(400, { error: `size must be an integer from 1 to ${MAX_SIZE} bytes` });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `images/${body.sensor_id}/${stamp}-${crypto.randomUUID().slice(0, 8)}.png`;

  try {
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: process.env.IMAGES_BUCKET, Key: key, ContentType: CONTENT_TYPE }),
      { expiresIn: TTL_SEC }
    );
    return reply(200, {
      upload_url: uploadUrl,
      object_key: key,
      method: 'PUT',
      headers: { 'Content-Type': CONTENT_TYPE },
      expires_in: TTL_SEC,
    });
  } catch (err) {
    console.error('presign failed', err);
    return reply(500, { error: 'internal error' });
  }
};
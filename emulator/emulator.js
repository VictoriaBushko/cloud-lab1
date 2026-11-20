const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const url = process.env.INGEST_URL || 'http://localhost:8080/ingest';
const apiKey = process.env.API_KEY || 'dev-key';
const durationSec = Number(process.env.DURATION_SEC || config.durationSec);

const intervalFor = (sensor) => Number(process.env.INTERVAL_MS || sensor.intervalMs);

for (const sensor of config.sensors) {
  const interval = intervalFor(sensor);
  if (!(interval >= 20 && interval <= 100)) {
    console.error(`intervalMs for ${sensor.sensor_id} must be between 20 and 100`);
    process.exit(1);
  }
}

const uploadUrlEndpoint = new URL('/upload-url', url).toString();
const cameras = process.env.NO_CAMERA ? [] : config.cameras || [];
const stats = { sent: 0, ok: 0, errors: 0 };
const photos = { uploaded: 0, failed: 0 };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
// PNG with random pixels (does not compress well), side 100..300 px gives roughly 30..270 KB
const makePng = () => {
  const side = 100 + Math.floor(Math.random() * 201);
  const row = side * 3 + 1;
  const raw = Buffer.alloc(row * side);
  for (let y = 0; y < side; y++) {
    for (let i = 1; i < row; i++) raw[y * row + i] = Math.floor(Math.random() * 256);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(side, 0);
  ihdr.writeUInt32BE(side, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const send = async (message) => {
  stats.sent++;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 202) {
      stats.ok++;
    } else {
      stats.errors++;
    }
  } catch {
    stats.errors++;
  }
};

const runSensor = async (sensor, endTime) => {
  const step = (sensor.max - sensor.min) / 20;
  let value = (sensor.min + sensor.max) / 2;
  while (Date.now() < endTime) {
    const started = Date.now();
    value = Math.min(sensor.max, Math.max(sensor.min, value + (Math.random() - 0.5) * step));
    await send({
      sensor_id: sensor.sensor_id,
      sensor_type: sensor.sensor_type,
      value: Number(value.toFixed(2)),
      unit: sensor.unit,
      location: sensor.location,
      measured_at: new Date().toISOString(),
    });
    await sleep(Math.max(0, intervalFor(sensor) - (Date.now() - started)));
  }
};

const shoot = async (camera) => {
  const image = makePng();
  try {
    const first = await fetch(uploadUrlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ sensor_id: camera.sensor_id, size: image.length }),
      signal: AbortSignal.timeout(5000),
    });
    if (first.status !== 200) throw new Error(`upload-url ${first.status}`);
    const ticket = await first.json();
    const put = await fetch(ticket.upload_url, {
      method: 'PUT',
      headers: ticket.headers,
      body: image,
      signal: AbortSignal.timeout(15000),
    });
    if (put.status !== 200) throw new Error(`upload ${put.status}`);
    photos.uploaded++;
    await send({
      sensor_id: camera.sensor_id,
      sensor_type: 'camera',
      value: image.length,
      unit: 'bytes',
      location: camera.location,
      measured_at: new Date().toISOString(),
      object_key: ticket.object_key,
    });
  } catch (err) {
    photos.failed++;
    stats.sent++;
    stats.errors++;
    console.error(`camera ${camera.sensor_id}: ${err.message}`);
  }
};

const runCamera = async (camera, endTime) => {
  while (Date.now() < endTime) {
    await shoot(camera);
    const span = camera.maxIntervalSec - camera.minIntervalSec;
    const pause = (camera.minIntervalSec + Math.random() * span) * 1000;
    await sleep(Math.min(pause, Math.max(0, endTime - Date.now())));
  }
};

const main = async () => {
  const endTime = Date.now() + durationSec * 1000;
  const intervals = config.sensors.map((s) => `${s.sensor_id}=${intervalFor(s)}ms`).join(', ');
  console.log(`start: ${config.sensors.length} sensors, ${cameras.length} cameras, intervals ${intervals}, ${durationSec} s, target ${url}`);
  const timer = setInterval(() => {
    console.log(`sent=${stats.sent} ok=${stats.ok} errors=${stats.errors}`);
  }, 5000);
  await Promise.all([
    ...config.sensors.map((sensor) => runSensor(sensor, endTime)),
    ...cameras.map((camera) => runCamera(camera, endTime)),
  ]);
  clearInterval(timer);
  console.log(`done: sent=${stats.sent} ok=${stats.ok} errors=${stats.errors} photos=${photos.uploaded}`);
};

main();
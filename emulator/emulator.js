const fs = require('fs');
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

const stats = { sent: 0, ok: 0, errors: 0 };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const main = async () => {
  const endTime = Date.now() + durationSec * 1000;
  const intervals = config.sensors.map((s) => `${s.sensor_id}=${intervalFor(s)}ms`).join(', ');
  console.log(`start: ${config.sensors.length} sensors, intervals ${intervals}, ${durationSec} s, target ${url}`);
  const timer = setInterval(() => {
    console.log(`sent=${stats.sent} ok=${stats.ok} errors=${stats.errors}`);
  }, 5000);
  await Promise.all(config.sensors.map((sensor) => runSensor(sensor, endTime)));
  clearInterval(timer);
  console.log(`done: sent=${stats.sent} ok=${stats.ok} errors=${stats.errors}`);
};

main();
const { query, ensureSchema, toDbTime } = require('./db');
const { putRaw } = require('./raw');
const { headImage } = require('./images');

const MAX_IMAGE_SIZE = 1048576;

const previousValue = async (sensorId, measuredAt) => {
  const rows = await query(
    'SELECT `value` FROM measurements WHERE sensor_id = ? AND measured_at < ? ORDER BY measured_at DESC LIMIT 1',
    [sensorId, toDbTime(measuredAt)]
  );
  return rows.length ? rows[0].value : null;
};

const processTemperature = async (m) => {
  let value = m.value;
  let unit = m.unit;
  if (unit === 'F') {
    value = ((value - 32) * 5) / 9;
    unit = 'C';
  }
  value = Number(value.toFixed(2));
  if (value < -50 || value > 60) {
    return { value, unit, status: 'out_of_range', note: 'temperature outside -50..60 C' };
  }
  const previous = await previousValue(m.sensor_id, m.measured_at);
  if (previous !== null && Math.abs(value - previous) > 5) {
    const jump = Math.abs(value - previous).toFixed(2);
    return { value, unit, status: 'anomaly', note: `jump of ${jump} C from previous value` };
  }
  return { value, unit, status: 'ok', note: null };
};

const processHumidity = async (m) => {
  if (m.value < 0 || m.value > 100) {
    return { value: m.value, unit: m.unit, status: 'out_of_range', note: 'humidity outside 0..100 %' };
  }
  return { value: m.value, unit: m.unit, status: 'ok', note: null };
};

const processLight = async (m) => {
  let value = m.value;
  let unit = m.unit;
  if (unit === 'klx') {
    value = value * 1000;
    unit = 'lux';
  }
  value = Number(value.toFixed(2));
  if (value < 0 || value > 100000) {
    return { value, unit, status: 'out_of_range', note: 'light outside 0..100000 lux' };
  }
  return { value, unit, status: 'ok', note: null };
};

const processCamera = async (m) => {
  if (!m.object_key) {
    throw new Error('camera message without object_key');
  }
  const head = await headImage(m.object_key);
  const size = head.ContentLength;
  if (size > MAX_IMAGE_SIZE) {
    return { value: size, unit: 'bytes', status: 'out_of_range', note: 'image larger than 1 MB' };
  }
  return { value: size, unit: 'bytes', status: 'ok', note: null };
};

const processors = {
  temperature: processTemperature,
  humidity: processHumidity,
  light: processLight,
  camera: processCamera,
};

const save = (m, r) =>
  query(
    'INSERT INTO measurements (sensor_id, measured_at, sensor_type, `value`, unit, lat, lon, status, note, object_key) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE sensor_id = sensor_id',
    [
      m.sensor_id,
      toDbTime(m.measured_at),
      m.sensor_type,
      r.value,
      r.unit,
      m.location.lat,
      m.location.lon,
      r.status,
      r.note,
      m.object_key || null,
    ]
  );

const processRecord = async (record) => {
  const m = JSON.parse(record.body);
  const process = processors[m.sensor_type];
  if (!process) {
    throw new Error(`unknown sensor_type ${m.sensor_type}`);
  }
  await putRaw(m);
  const result = await process(m);
  await save(m, result);
  if (result.status !== 'ok') {
    console.log(
      JSON.stringify({ sensor_id: m.sensor_id, measured_at: m.measured_at, status: result.status, note: result.note })
    );
  }
};

exports.handler = async (event) => {
  await ensureSchema();
  const failures = [];
  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (err) {
      console.error('failed', record.messageId, err.message);
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  console.log(JSON.stringify({ processed: event.Records.length - failures.length, failed: failures.length }));
  return { batchItemFailures: failures };
};
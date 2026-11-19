const mysql = require('mysql2/promise');

let pool;
let schemaReady;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: 1,
      timezone: 'Z',
      dateStrings: true,
    });
  }
  return pool;
};

const query = async (sql, params) => {
  const [rows] = await getPool().query(sql, params);
  return rows;
};

const ensureSchema = () => {
  if (!schemaReady) {
    schemaReady = query(
      'CREATE TABLE IF NOT EXISTS measurements (' +
        'sensor_id VARCHAR(64) NOT NULL, ' +
        'measured_at DATETIME(3) NOT NULL, ' +
        'sensor_type VARCHAR(16) NOT NULL, ' +
        '`value` DOUBLE NOT NULL, ' +
        'unit VARCHAR(16) NOT NULL, ' +
        'lat DOUBLE NOT NULL, ' +
        'lon DOUBLE NOT NULL, ' +
        'status VARCHAR(16) NOT NULL, ' +
        'note VARCHAR(128) NULL, ' +
        'PRIMARY KEY (sensor_id, measured_at)' +
        ') ENGINE=InnoDB'
    ).catch((err) => {
      schemaReady = undefined;
      throw err;
    });
  }
  return schemaReady;
};

const toDbTime = (iso) => new Date(iso).toISOString().slice(0, 23).replace('T', ' ');
const fromDbTime = (value) => value.replace(' ', 'T') + 'Z';

module.exports = { query, ensureSchema, toDbTime, fromDbTime };
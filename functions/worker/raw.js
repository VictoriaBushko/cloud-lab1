const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const normalize = (iso) => new Date(iso).toISOString();

const putRaw = (m) =>
  doc.send(
    new PutCommand({
      TableName: process.env.RAW_TABLE,
      Item: {
        sensor_id: m.sensor_id,
        measured_at: normalize(m.measured_at),
        sensor_type: m.sensor_type,
        value: m.value,
        unit: m.unit,
        location: m.location,
        ...(m.object_key ? { object_key: m.object_key } : {}),
      },
    })
  );

const queryRaw = async (sensorId, from, to, limit) => {
  const res = await doc.send(
    new QueryCommand({
      TableName: process.env.RAW_TABLE,
      KeyConditionExpression: 'sensor_id = :s AND measured_at BETWEEN :a AND :b',
      ExpressionAttributeValues: {
        ':s': sensorId,
        ':a': from ? normalize(from) : '0000-01-01T00:00:00.000Z',
        ':b': to ? normalize(to) : '9999-12-31T23:59:59.999Z',
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return res.Items;
};

module.exports = { putRaw, queryRaw };
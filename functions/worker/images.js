const { S3Client, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({});
const READ_TTL_SEC = 300;

const readUrl = (key) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.IMAGES_BUCKET, Key: key }), {
    expiresIn: READ_TTL_SEC,
  });

const headImage = (key) => s3.send(new HeadObjectCommand({ Bucket: process.env.IMAGES_BUCKET, Key: key }));

module.exports = { readUrl, headImage, READ_TTL_SEC };
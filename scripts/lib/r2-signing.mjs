// Shared S3 GET signing, extracted from fetch-rum-from-r2 (S387). No network side effects.
import crypto from 'node:crypto';
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
const sha256hex = (data) => crypto.createHash('sha256').update(data).digest('hex');

// RFC 3986 strict encoding for query values (S3 canonical form)
export function rfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

export function signRequest({ method, host, pathName, query, accessKey, secretKey, now = new Date() }) {
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const payloadHash = sha256hex(''); // GET requests, empty body

  const canonicalQuery = Object.entries(query || {})
    .map(([k, v]) => [rfc3986(k), rfc3986(String(v))])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [method, pathName, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  return {
    url: `https://${host}${pathName}${canonicalQuery ? `?${canonicalQuery}` : ''}`,
    headers: {
      Host: host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}


import axios from 'axios';
import https from 'https';

const tableName = process.env.AIRTABLE_TABLE_NAME ?? 'Final list';
const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;

if (!baseId) {
  throw new Error('Missing AIRTABLE_BASE_ID environment variable');
}

if (!apiKey) {
  throw new Error('Missing AIRTABLE_API_KEY environment variable');
}

const baseURL = `https://api.airtable.com/v0/${baseId}/`;

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
});

export const AIRTABLE_HEADERS = {
  Authorization: `Bearer ${apiKey}`,
};

export const AIRTABLE_TABLE_NAME = tableName;
export const AIRTABLE_TABLE_PATH = encodeURIComponent(tableName);

export const airtableClient = axios.create({
  baseURL,
  headers: AIRTABLE_HEADERS,
  httpsAgent,
  timeout: 20_000,
});

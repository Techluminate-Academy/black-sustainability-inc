#!/usr/bin/env node
/**
 * Count new members added to the Global BSN Map in 2025.
 * Uses Airtable API directly (no MongoDB needed).
 *
 * "On the map" = has valid LATITUDE (NEW) and LONGITUDE (NEW).
 * "New in 2025" = createdTime is between 2025-01-01 and 2025-12-31.
 *
 * Run: node scripts/count-new-map-members-2025.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const axios = require('axios');
const fs = require('fs');

const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN || process.env.AIRTABLE_ACCESS_TOKEN;
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME;

async function fetchAllRecords() {
  let allRecords = [];
  let offset = '';

  do {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;
    const params = { pageSize: 100 };
    if (offset) params.offset = offset;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      params,
    });

    allRecords = allRecords.concat(response.data.records);
    offset = response.data.offset || '';
  } while (offset);

  return allRecords;
}

function isValidCoord(val) {
  const n = parseFloat(val);
  return typeof n === 'number' && !isNaN(n);
}

function isOnMap(record) {
  const lat = record.fields?.['LATITUDE (NEW)'];
  const lng = record.fields?.['LONGITUDE (NEW)'];
  if (!isValidCoord(lat) || !isValidCoord(lng)) return false;
  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);
  return latN >= -90 && latN <= 90 && lngN >= -180 && lngN <= 180;
}

function isCreatedIn2025(record) {
  const ct = record.createdTime || '';
  return ct >= '2025-01-01' && ct < '2026-01-01';
}

function escapeCsv(val) {
  if (val == null || val === '') return '';
  const s = String(val).replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

async function countNewMapMembers2025() {
  if (!AIRTABLE_API_KEY || !BASE_ID || !TABLE_NAME) {
    console.error('❌ Set NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN, NEXT_PUBLIC_AIRTABLE_BASE_ID, NEXT_PUBLIC_AIRTABLE_TABLE_NAME');
    process.exit(1);
  }

  try {
    console.log('Fetching records from Airtable...');
    const records = await fetchAllRecords();
    console.log(`Fetched ${records.length} total records.`);

    const members = records.filter((r) => isCreatedIn2025(r) && isOnMap(r));

    const headers = [
      'First Name', 'Last Name', 'Email', 'Organization', 'Location (Nearest City)',
      'State/Province', 'Country', 'Primary Industry', 'Website', 'Created Date',
      'Latitude', 'Longitude'
    ];
    const rows = members.map((r) => {
      const f = r.fields || {};
      return [
        escapeCsv(f['FIRST NAME']),
        escapeCsv(f['LAST NAME']),
        escapeCsv(f['EMAIL ADDRESS']),
        escapeCsv(f['ORGANIZATION NAME']),
        escapeCsv(f['Location (Nearest City)']),
        escapeCsv(f['State/Province']),
        escapeCsv(Array.isArray(f.Country) ? f.Country[0] : f.Country),
        escapeCsv(f['PRIMARY INDUSTRY HOUSE']),
        escapeCsv(f.WEBSITE),
        escapeCsv(r.createdTime),
        escapeCsv(f['LATITUDE (NEW)']),
        escapeCsv(f['LONGITUDE (NEW)']),
      ];
    });

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const outPath = 'new-map-members-2025.csv';
    fs.writeFileSync(outPath, csv, 'utf8');

    console.log('\n========================================');
    console.log('  New Map Members in 2025');
    console.log('========================================');
    console.log(`  Total: ${members.length}`);
    console.log(`  CSV saved: ${outPath}`);
    console.log('========================================\n');

    return members.length;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

countNewMapMembers2025();

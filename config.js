'use strict';
const path = require('node:path');
const REHEARSAL_MODE = process.env.REHEARSAL_MODE === '1';
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
module.exports = Object.freeze({
  PORT,
  DATA_DIR,
  STATE_FILE: path.join(DATA_DIR, 'state.json'),
  REHEARSAL_MODE,
  R1_SLOT_SECONDS: REHEARSAL_MODE ? 5 : Math.max(1, Number(process.env.R1_SLOT_SECONDS) || 20),
  R2_SLOT_MS: REHEARSAL_MODE ? 20_000 : 300_000,
  R2_TOTAL_MS: REHEARSAL_MODE ? 80_000 : 1_200_000,
  FINALISTS_DEFAULT: Math.max(1, Number(process.env.FINALISTS || 12)),
  TRUST_PROXY: process.env.TRUST_PROXY === '1'
});

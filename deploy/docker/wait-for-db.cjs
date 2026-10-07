#!/usr/bin/env node
// Waits until the database host:port from DATABASE_URL accepts TCP
// connections before the entrypoint runs `prisma migrate deploy`.
// Secret values (user/password) are never printed.

'use strict';

const net = require('node:net');
const { URL } = require('node:url');

const raw = process.env.DATABASE_URL || '';
const timeoutSeconds = Number(process.env.WAIT_FOR_DB_SECONDS || 120);

if (!raw.startsWith('mysql://')) {
  console.error('[wait-for-db] DATABASE_URL must be a mysql:// URL.');
  process.exit(1);
}

let target;
try {
  const url = new URL(raw);
  target = { host: url.hostname, port: Number(url.port || 3306) };
} catch {
  console.error('[wait-for-db] DATABASE_URL could not be parsed.');
  process.exit(1);
}

if (!target.host) {
  console.error('[wait-for-db] DATABASE_URL has no host.');
  process.exit(1);
}

const deadline = Date.now() + timeoutSeconds * 1000;

function tryConnect() {
  const socket = net.connect({ host: target.host, port: target.port, timeout: 2000 });
  const finish = (connected) => {
    socket.destroy();
    if (connected) {
      console.error(`[wait-for-db] Database at ${target.host}:${target.port} is accepting connections.`);
      process.exit(0);
    }
    if (Date.now() > deadline) {
      console.error(`[wait-for-db] Timed out waiting for ${target.host}:${target.port} after ${timeoutSeconds}s.`);
      process.exit(1);
    }
    setTimeout(tryConnect, 2000);
  };
  socket.on('connect', () => finish(true));
  socket.on('error', () => finish(false));
  socket.on('timeout', () => finish(false));
}

console.error(`[wait-for-db] Waiting up to ${timeoutSeconds}s for ${target.host}:${target.port}...`);
tryConnect();

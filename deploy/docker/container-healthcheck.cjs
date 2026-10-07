#!/usr/bin/env node
// Docker health check for the RiskHRMS app container: exit 0 only when
// /health answers successfully. Secrets and response bodies are not printed.

'use strict';

fetch('http://127.0.0.1:3000/health', { headers: { Accept: 'application/json' } })
  .then((response) => process.exit(response.ok ? 0 : 1))
  .catch(() => process.exit(1));

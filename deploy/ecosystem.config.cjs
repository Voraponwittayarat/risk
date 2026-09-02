const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const runtimeRoot = path.join(process.env.PROGRAMDATA || projectRoot, 'RiskHRMS');

module.exports = {
  apps: [
    {
      name: 'risk-hrms',
      cwd: path.join(projectRoot, 'backend'),
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 3000,
      max_memory_restart: '1G',
      time: true,
      output: path.join(runtimeRoot, 'logs', 'app-output.log'),
      error: path.join(runtimeRoot, 'logs', 'app-error.log'),
      env: {
        NODE_ENV: 'production',
        FRONTEND_DIST_DIR: path.join(projectRoot, 'frontend', 'dist'),
      },
    },
  ],
};

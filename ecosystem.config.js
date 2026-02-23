// PM2 Ecosystem Config — for Hostinger VPS / any VPS deployment
// Usage: pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: "bodylang",
      script: "server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "256M",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};

module.exports = {
  apps: [
    {
      name: 'personalea-api',
      script: './testing/goal-strategy-test/openai-api-server-fixed.js',
      cwd: '/workspaces/personalEA',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      // Restart policy
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      restart_delay: 4000,
      // Health check
      listen_timeout: 3000,
      kill_timeout: 5000,
      // Monitoring
      instance_var: 'INSTANCE_ID',
      merge_logs: true,
      // Graceful reload
      wait_ready: true,
      shutdown_with_message: true
    },
    {
      name: 'personalea-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: '/workspaces/personalEA/testing/goal-strategy-test',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5174
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000
    },
    {
      name: 'personalea-monitor',
      script: './health-monitor-enhanced.js',
      cwd: '/workspaces/personalEA',
      watch: false,
      env: {
        API_URL: 'http://localhost:3000',
        FRONTEND_URL: 'http://localhost:5174',
        CHECK_INTERVAL: 30000,
        ALERT_THRESHOLD: 3
      },
      error_file: './logs/monitor-error.log',
      out_file: './logs/monitor-out.log',
      autorestart: true,
      max_restarts: 5
    }
  ],

  // Deploy configuration
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/user/personalea.git',
      path: '/var/www/personalea',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
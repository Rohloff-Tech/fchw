// PM2 process manager config for running the server in production.
// Usage: pm2 start ecosystem.config.js
module.exports = {
    apps: [{
        name: 'teams-cqm',
        script: './server.js',
        instances: 1,
        exec_mode: 'fork',
        watch: false,
        max_memory_restart: '512M',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: './data/pm2-error.log',
        out_file: './data/pm2-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }]
};

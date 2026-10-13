module.exports = {
  apps: [
    {
      name: 'cloudstoragepx',
      script: 'server.ts',
      interpreter: 'node',
      interpreter_args: '--loader tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPort: parseInt(process.env.API_PORT ?? '3001', 10),
  dashboardUrl: process.env.DASHBOARD_URL ?? 'http://localhost:3000',

  database: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    username: process.env.POSTGRES_USER ?? 'brainstack',
    password: process.env.POSTGRES_PASSWORD ?? 'brainstack',
    name: process.env.POSTGRES_DB ?? 'brainstack_booking',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY ?? '',
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  },
});

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
    model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b',
  },

  knowledge: {
    embeddingModel:
      process.env.KNOWLEDGE_EMBEDDING_MODEL ?? 'Xenova/all-MiniLM-L6-v2',
    topK: parseInt(process.env.KNOWLEDGE_TOP_K ?? '3', 10),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? '',
  },
});

const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");
const { connectDb } = require("./config/db");

async function bootstrap() {
  await connectDb();

  app.listen(env.port, () => {
    logger.info(`Backend server running on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", { error: error.message });
  process.exit(1);
});

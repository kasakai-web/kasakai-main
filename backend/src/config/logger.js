const env = require("./env");

function format(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaText = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaText}`;
}

const logger = {
  info(message, meta) {
    console.log(format("info", message, meta));
  },
  warn(message, meta) {
    console.warn(format("warn", message, meta));
  },
  error(message, meta) {
    console.error(format("error", message, meta));
  },
  debug(message, meta) {
    if (env.nodeEnv === "development") {
      console.debug(format("debug", message, meta));
    }
  }
};

module.exports = logger;

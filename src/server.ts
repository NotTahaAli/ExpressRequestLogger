import http from "http";
import { appConfig } from "./configs/app.config.js";
import { app, appStarted, setupRoutes } from "./app.js";
import { logger } from "./utils/logger.util.js";
const server = http.createServer(app);

async function startServer() {
    try {
        await setupRoutes();
        server.listen(appConfig.port, () => {
            logger.info(`🚀 Server running at http://localhost:${appConfig.port}`);
            appStarted().catch((error) => {
                logger.error("Error during app startup:", error);
                server.close(() => {
                    process.exit(1);
                })
            });
        });
    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
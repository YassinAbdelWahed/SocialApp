import { resolve } from "node:path";
import { config } from "dotenv";
config({ path: resolve("./config/.env.dev") });

import type { Request, Express, Response } from "express";
import express from "express";

import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit"

import authController from "./modules/auth/auth.controller";
import userController from "./modules/user/user.controller";
import { globalErrorHandling } from "./utils/response/error.response";
import connectDB from "./DB/connections.db";

const limiter = rateLimit({
    windowMs: 60 * 60000,
    limit: 2000,
    message: { error: "too many request plz try again" },
    statusCode: 429,
});

const bootstrap = async (): Promise<void> => {
    const app: Express = express();

    const port: number | string = process.env.PORT || 5000;

    app.use(cors(), express.json(), helmet(), limiter);

    app.get("/", (req: Request, res: Response) => {
        res.json({ message: `Welcome to ${process.env.APPLICATION_NAME} backend landing page` });
    });

    app.use("/auth", authController);

    app.use("/user", userController);

    app.use("{/*dummy}", (req: Request, res: Response) => {
        return res.status(404).json({ message: "In-valid application routing" });
    });

    app.use(globalErrorHandling)

    await connectDB()

    app.listen(port, () => {
        console.log(`Server is running on port ::: ${port}`)
    })
}

export default bootstrap;
import { resolve } from "node:path";
import { config } from "dotenv";
config({ path: resolve("./src/config/.env.dev") });

import type { Request, Express, Response } from "express";
import express from "express";

import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit"

import { authRouter, postRouter, userRouter } from "./modules";

import { BadRequestException, globalErrorHandling } from "./utils/response/error.response";
import connectDB from "./DB/connections.db";

import { createGetPreSignedLink, getFile } from "./utils/multer/s3.config";

import { promisify } from "node:util";
import { pipeline } from "node:stream";
const createS3WriteStreamPipe = promisify(pipeline)

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

    app.use("/auth", authRouter);
    app.use("/user", userRouter);
    app.use("/post", postRouter);

    app.get("/upload/*path", async (req: Request, res: Response): Promise<void> => {

        const { downloadName, download = "false" } = req.query as { downloadName?: string, download?: string };

        const { path } = req.params as unknown as { path: string[] };
        const Key = path.join("/");
        const s3Response = await getFile({ Key });
        console.log(s3Response)

        if (!s3Response?.Body) {
            throw new BadRequestException("fail to fetch this asset")
        }

        res.setHeader("Content-type", `${s3Response.ContentType || "application/octet-stream"}`);
        if (download === "true") {
            res.setHeader("Content-Disposition", `attachment; filename = "${downloadName || Key.split("/").pop()}"`);
        }

        return await createS3WriteStreamPipe(s3Response.Body as NodeJS.ReadableStream, res);
    });

    app.get("/upload/pre-signed/*path", async (req: Request, res: Response): Promise<Response> => {

        const { downloadName, download = "false", expiresIn = 120 } = req.query as { downloadName?: string, download?: string, expiresIn?: number };

        const { path } = req.params as unknown as { path: string[] };
        const Key = path.join("/");
        const url = await createGetPreSignedLink({ Key, downloadName: downloadName as string, download, expiresIn });
        return res.json({ message: "done", data: { url } })
    });

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
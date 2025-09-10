import { connect } from "mongoose";
import { log } from "node:console";
import { UserModel } from "./model/User.model";

const connectDB = async (): Promise<void> => {
    try {
        const result = await connect(process.env.DB_URL as string, {
            serverSelectionTimeoutMS: 30000,
        });
        await UserModel.syncIndexes();
        console.log(result.models);
        console.log("DB connected successfully !!!");
    } catch (error) {
        log("fail to connect on DB")
    }
};



export default connectDB
import mongoose from "mongoose";

export const connectDB = async () => {

    const connection_string = process.env.DB_CONNECT_TO === 'local' ? process.env.LOCAL_DATABASE : process.env.LIVE_DATABASE;

    try {
        await mongoose.connect(connection_string, {
            useUnifiedTopology: true,
            useNewUrlParser: true
        });
    } catch (err) {
        console.log(err);
    }
}
import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.LOCAL_DATABASE, {
            useUnifiedTopology: true,
            useNewUrlParser: true
        });
    } catch (err) {
        console.log(err);
    }
}
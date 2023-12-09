import mongoose, { Schema } from "mongoose";

const logSchema = new Schema({
    _id: {
        type: String
    },
    user_id: {
        type: String,
    },
    poll_id: {
        type: String,
    },
    logged_at: {
        type: String,
        required: true
    },
    log_message: {
        type: String,
        required: true
    },
    log_type: {
        type: String,
        required: true
    },
    is_error: {
        type: String,
        required: true
    }
}, {versionKey: false});

export const Log = mongoose.model('Log', logSchema); 
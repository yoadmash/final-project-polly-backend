import mongoose, { Schema } from "mongoose";

const logSchema = new Schema({
    _id: {
        type: String,
    },
    date_time: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
    },
    user_name: {
        type: String,
    },
    poll_id: {
        type: String,
    },
    poll_title: {
        type: String,
    },
    template_id: {
        type: String,
    },
    template_title: {
        type: String,
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
}, { versionKey: false });

export const Log = mongoose.model('Log', logSchema); 
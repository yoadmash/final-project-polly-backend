import mongoose, { Schema } from "mongoose";

const templateSchema = new Schema({
    _id: {
        type: String,
        select: false
    },
    name: {
        type: String,
        required: true
    },
    fields: {
        type: Object,
        required: true
    }
}, { versionKey: false });

export const PollTemplate = mongoose.model('Template', templateSchema); 
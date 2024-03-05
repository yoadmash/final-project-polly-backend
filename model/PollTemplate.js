import mongoose, { Schema } from "mongoose";

const templateSchema = new Schema({
    _id: {
        type: String,
    },
    title: {
        type: String,
        required: true
    },
    fields: {
        type: Object,
        required: true
    },
    show: {
        type: Boolean,
        required: false
    }
}, { versionKey: false });

export const PollTemplate = mongoose.model('Template', templateSchema); 
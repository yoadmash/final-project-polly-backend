import mongoose, { Schema } from "mongoose";

const pollSchema = new Schema({
    _id: {
        type: String
    },
    owner: {
        id: {
            type: String,
            required: true
        },
        username: {
            type: String,
            required: true
        }
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    image_path: {
        type: String,
        required: false,
    },
    creation_date: {
        type: String,
        required: true
    },
    creation_time: {
        type: String,
        required: true
    },
    questions: {
        type: [],
        required: true
    },
    answers: {
        type: [],
        required: false
    },
    settings: {
        type: {},
        required: true
    }
}, { versionKey: false });

export const Poll = mongoose.model('Poll', pollSchema); 
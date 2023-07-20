import mongoose, { Schema } from "mongoose";
import { v4 as uuid } from 'uuid';

const pollSchema = new Schema({
    _id: {
        type: String,
        default: uuid()
    },
    ownerId: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true
    },
    creation_date: {
        type: Date,
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
        type: [],
        required: true
    }
});

export const Poll = mongoose.model('Poll', pollSchema); 
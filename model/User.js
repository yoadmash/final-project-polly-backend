import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    _id: {
        type: String
    },
    firstname: {
        type: String,
        required: [true, 'firstname is required']
    },
    lastname: {
        type: String,
        required: [true, 'lastname is required']
    },
    email: {
        unique: true,
        type: String,
        match: [
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'email is not valid'
        ],
        lowercase: true,
        required: [true, 'email is required']
    },
    username: {
        unique: true,
        type: String,
        required: [true, 'username is required']
    },
    password: {
        type: String,
        required: [true, 'password is required'],
        select: false
    },
    refreshToken: {
        type: String,
        required: false
    },
    resetPassToken: {
        type: String,
        required: false
    },
    polls_created: {
        type: [],
        required: false
    },
    polls_answered: {
        type: [],
        required: false
    },
    polls_visited: {
        type: [],
        required: false
    },
    profile_pic_path: {
        type: String,
        required: false
    },
    profile_pic_uuid: {
        type: String,
        required: false
    },
    active: {
        type: Boolean,
        default: true,
        require: false
    },
    admin: {
        type: Boolean,
        default: false,
        required: false,
    },
    registered_at: {
        type: String,
        required: true
    },
}, {versionKey: false});

export const User = mongoose.model('User', userSchema); 
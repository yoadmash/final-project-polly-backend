import { UploadClient } from "@uploadcare/upload-client";
import { deleteFile, UploadcareSimpleAuthSchema } from "@uploadcare/rest-client";
import { User } from "../model/User.js";
import { logToDB } from '../utils/log.js';
import fs from 'fs';
import path from 'path';
import dirname_filename from '../utils/dirname_filename.js';

const { __dirname } = dirname_filename(import.meta);

const handleProfilePictureUploadExternal = async (req, res) => {
    const foundUser = await User.findById(req.user);
    if (foundUser.profile_pic_path && foundUser.profile_pic_uuid) {
        try {
            await deleteFile({ uuid: foundUser.profile_pic_uuid }, {
                authSchema: new UploadcareSimpleAuthSchema({
                    publicKey: process.env.IMG_SERVICE_KEY,
                    secretKey: process.env.IMG_SERVICE_SECRET,
                })
            });
        } catch (err) {
            logToDB({
                user_id: foundUser.id,
                user_name: foundUser.username,
                log_message: `unable to remove old profile picture (${foundUser.profile_pic_uuid}) from storage, error: ${err.message}`,
                log_type: 'users'
            }, true);
        }
    }
    const client = new UploadClient({ publicKey: process.env.IMG_SERVICE_KEY });
    const fileToUpload = Object.values(req.files)[0].data;
    try {
        const file = await client.uploadFile(fileToUpload, { fileName: req.user });
        foundUser.profile_pic_path = file.cdnUrl + '-/preview/';
        foundUser.profile_pic_uuid = file.uuid;
        foundUser.save();
        logToDB({
            user_id: foundUser.id,
            user_name: foundUser.username,
            log_message: `profile picture uploaded`,
            log_type: 'users'
        }, false);
    } catch (err) {
        logToDB({
            user_id: foundUser.id,
            user_name: foundUser.username,
            log_message: `unable to upload profile picture, error: ${err.message}`,
            log_type: 'users'
        }, true);
        return res.status(500).json({ message: 'Unable to upload profile picture ' });
    }
    return res.json({ message: 'file uploaded', imgPath: foundUser.profile_pic_path });
}

const handleRemoveProfilePictureExternal = async (req, res) => {
    const { by_admin, userId } = req.body;
    const foundUser = await User.findById((by_admin) ? userId : req.user);
    if (!foundUser.profile_pic_path || !foundUser.profile_pic_uuid) {
        return res.status(409).json({ message: "Profile picture not found" });
    }
    try {
        await deleteFile({ uuid: foundUser.profile_pic_uuid }, {
            authSchema: new UploadcareSimpleAuthSchema({
                publicKey: process.env.IMG_SERVICE_KEY,
                secretKey: process.env.IMG_SERVICE_SECRET,
            })
        });
        foundUser.profile_pic_path = '';
        foundUser.profile_pic_uuid = '';
        await foundUser.save();
        logToDB({
            user_id: foundUser.id,
            user_name: foundUser.username,
            log_message: `profile picture removed`,
            log_type: 'users'
        }, false);
    } catch (err) {
        logToDB({
            user_id: foundUser.id,
            user_name: foundUser.username,
            log_message: `unable to remove old profile picture (${foundUser.profile_pic_uuid}) from storage, error: ${err.message}`,
            log_type: 'users'
        }, true);
        return res.status(500).json({ message: 'Unable to remove profile picture ' });
    }
    res.json({ message: 'picture deleted' });
}

const handleProfilePictureUpload = async (req, res) => {
    const foundUser = await User.findById(req.user);
    if (foundUser.profile_pic_path) {
        const fullPath = path.join(__dirname, '../public', foundUser.profile_pic_path);
        fs.unlink(fullPath, async (err) => {
            if (err) {
                logToDB({
                    user_id: foundUser.id,
                    user_name: foundUser.username,
                    log_message: `unable to delete current profile picture`,
                    log_type: 'users'
                }, true);
            }

        });
    }
    const file = Object.values(req.files)[0];
    const fileName = Object.keys(req.files)[0];
    const extName = path.extname(file.name);
    const fullFileName = `${fileName}${extName}`;
    const filePath = path.join(__dirname, '..', 'public', 'profile_pics', fullFileName);
    const userFilePath = `/profile_pics/${fullFileName}`;
    file.mv(filePath, async (err) => {
        if (err) {
            logToDB({
                user_id: foundUser.id,
                user_name: foundUser.username,
                log_message: `unable to upload profile picture`,
                log_type: 'users'
            }, true);
            return res.status(500).json({ message: 'something is wrong, unable to upload' });
        }
        try {
            foundUser.profile_pic_path = userFilePath;
            await foundUser.save();
        } catch (err) {
            logToDB({
                user_id: foundUser.id,
                user_name: foundUser.username,
                log_message: `unable to save profile picture path`,
                log_type: 'users'
            }, true);
            return res.status(500).json({ message: err.errors });
        }
    })

    logToDB({
        user_id: foundUser.id,
        user_name: foundUser.username,
        log_message: `profile picture uploaded`,
        log_type: 'users'
    }, false);

    return res.json({ message: 'file uploaded', imgPath: userFilePath });
}

const handleRemoveProfilePicture = async (req, res) => {
    const foundUser = await User.findById(req.user);
    const { profile_pic_path } = req.body;
    const fullPath = path.join(__dirname, '../public', profile_pic_path);
    fs.unlink(fullPath, async (err) => {
        if (err) {
            logToDB({
                user_id: foundUser.id,
                user_name: foundUser.username,
                log_message: `unable to delete profile picture`,
                log_type: 'users'
            }, true);
            res.status(500).json({ message: 'something is wrong, unable to delete picture' });
            return;
        };
        foundUser.profile_pic_path = undefined;
        await foundUser.save();
        logToDB({
            user_id: foundUser.id,
            user_name: foundUser.username,
            log_message: `profile picture removed`,
            log_type: 'users'
        }, false);
        return res.sendStatus(200);
    });
}

const handleUserActiveStatus = async (req, res) => {
    const { state, by_admin } = req.query;
    const { userId } = req.body;
    const foundUser = await User.findById((by_admin) ? userId : req.user);

    try {
        foundUser.active = state;
        foundUser.refreshToken = '';
        await foundUser.save();
        if (!by_admin) {
            res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true }); //sameSite: 'None', secure: true
        }
        res.status(200).json({ message: `${foundUser.username} has been ${(Number(state)) ? 'activated' : 'deactivated'}` });
        logToDB({
            user_id: foundUser.id,
            user_name: foundUser.username,
            log_message: `user ${(Number(state)) ? 'activated' : 'deactivated'}`,
            log_type: 'users'
        }, false);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const handleUserAdminStatus = async (req, res) => {
    const { userId } = req.body;

    const foundUser = await User.findById(req.user);
    if (!foundUser.admin) return res.status(401).json({ message: "You're not an Admin!" });

    const setUser = await User.findById(userId);
    if (!setUser) return res.status(404).json({ message: 'User not found' });
    try {
        setUser.admin = !setUser.admin;
        await setUser.save();
        res.status(200).json({ message: (setUser.admin) ? 'admin permission grannted' : 'admin permission revoked' });
        logToDB({
            user_id: setUser.id,
            user_name: setUser.username,
            log_message: (setUser.admin) ? `admin permission granted by ${foundUser.username}` : `admin permission revoked by ${foundUser.username}`,
            log_type: 'users'
        }, false);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const handleGetUserById = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing user id' });

    const foundUser = await User.findById(id).select('-_id username profile_pic_path');
    if (!foundUser) return res.status(404).json({ message: `No user match this id: ${id}` });

    res.status(200).json({ foundUser });
}

const handleGetAllUsers = async (req, res) => {
    const foundUser = await User.findById(req.user);
    if (!foundUser.admin) return res.sendStatus(401);

    // const allUsers = await User.find({ _id: req.user });
    const allUsers = await User.find({ _id: { $not: { $regex: `${req.user}` } } });
    res.status(200).json({ allUsers });
}

const handleGetUserPolls = async (req, res) => {
    const foundUser = await User.findById(req.user);
    if (!foundUser) return res.status(404).json({ message: `No user match this id: ${req.user}` });
    const polls_created = JSON.parse(JSON.stringify(foundUser.polls_created));
    const polls_answered = JSON.parse(JSON.stringify(foundUser.polls_answered));
    const polls_visited = JSON.parse(JSON.stringify(foundUser.polls_visited));
    const polls = {
        created: [...polls_created],
        answered: [...polls_answered],
        visited: [...polls_visited],
    }
    res.status(200).json(polls);
}

export default {
    handleProfilePictureUploadExternal,
    handleRemoveProfilePictureExternal,
    handleProfilePictureUpload,
    handleRemoveProfilePicture,
    handleUserActiveStatus,
    handleUserAdminStatus,
    handleGetUserById,
    handleGetAllUsers,
    handleGetUserPolls,
};
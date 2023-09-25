import { User } from "../model/User.js";
import { log } from '../utils/log.js';
import fs from 'fs';
import path from 'path';
import dirname_filename from '../utils/dirname_filename.js';

const { __dirname } = dirname_filename(import.meta);

const handleProfilePictureUpload = async (req, res) => {
    const foundUser = await User.findById(req.user);
    if (foundUser.profile_pic_path) {
        const fullPath = path.join(__dirname, '../public', foundUser.profile_pic_path);
        fs.unlink(fullPath, async (err) => {
            if (err) return res.status(500).json({ message: 'something is wrong, unable to delete picture' });
        });
    }
    const file = Object.values(req.files)[0];
    const fileName = Object.keys(req.files)[0];
    const extName = path.extname(file.name);
    const fullFileName = `${fileName}${extName}`;
    const filePath = path.join(__dirname, '..', 'public', 'profile_pics', fullFileName);
    const userFilePath = `/profile_pics/${fullFileName}`;
    file.mv(filePath, async (err) => {
        if (err) return res.status(500).json({ message: 'something is wrong, unable to upload' });
        try {
            foundUser.profile_pic_path = userFilePath;
            await foundUser.save();
        } catch (err) {
            res.status(500).json({ message: err.errors });
        }
    })

    return res.json({ message: 'file uploaded', imgPath: userFilePath });
}

const handleRemoveProfilePicture = async (req, res) => {
    const foundUser = await User.findById(req.user);
    const { profile_pic_path } = req.body;
    const fullPath = path.join(__dirname, '../public', profile_pic_path);
    fs.unlink(fullPath, async (err) => {
        if (err) return res.status(500).json({ message: 'something is wrong, unable to delete picture' });
        foundUser.profile_pic_path = undefined;
        await foundUser.save();
    });
    res.status(200).json({ message: `the requested profile pic as been deleted` });
}

const handleUserDelete = async (req, res) => {
    const foundUser = await User.findById(req.user);
    if (foundUser.active) return res.status(406).json({ message: 'Unable to delete an active user' });
    try {
        await User.deleteOne({ _id: foundUser.id });
        res.status(200).json({ message: `${foundUser.username} has been deleted` });
        log(`${foundUser.username} (id: ${foundUser.id}) has been deleted`, 'usersLog');
    } catch (err) {
        res.status(500).json({ message: err.errors });
    }
}

const handleUserActiveStatus = async (req, res) => {
    const { state } = req.query;
    const foundUser = await User.findById(req.user);

    try {
        foundUser.active = state;
        foundUser.refreshToken = '';
        await foundUser.save();
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true }); //sameSite: 'None', secure: true
        res.status(200).json({ message: `${foundUser.username} has been ${(Number(state)) ? 'activated' : 'deactivated'}` });
        log(`${foundUser.username} (id: ${foundUser.id}) has been ${(Number(state)) ? 'activated' : 'deactivated'}`, 'usersLog');
    } catch (err) {
        res.status(500).json({ message: err.errors });
    }
}

const handleGetUserById = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing user id' });

    const foundUser = await User.findById(id).select('-refreshToken');
    if (!foundUser) return res.status(404).json({ message: `No user match this id: ${id}` });

    res.status(200).json({ foundUser });
}

const handleGetUserPolls = async (req, res) => {
    const foundUser = await User.findById(req.user);
    if (!foundUser) return res.status(404).json({ message: `No user match this id: ${id}` });
    const polls_created = JSON.parse(JSON.stringify(foundUser.polls_created));
    const polls_answered = JSON.parse(JSON.stringify(foundUser.polls_answered));
    const polls = [...polls_created, ...polls_answered];
    res.status(200).json(polls);
}

export default {
    handleProfilePictureUpload,
    handleRemoveProfilePicture,
    handleUserDelete,
    handleUserActiveStatus,
    handleGetUserById,
    handleGetUserPolls,
};
import { User } from "../model/User.js";

const handleUserDelete = async (req, res) => {
    const refreshToken = req.cookies?.jwt;
    const foundUser = await User.findOne({ refreshToken: refreshToken });
    if (foundUser.active) return res.status(406).json({ message: 'unable to delete an active user' });
    try {
        await User.deleteOne({ _id: foundUser.id });
        res.status(200).json({ message: `${foundUser.username} has been deleted` });
    } catch (err) {
        res.status(500).json({ message: err.errors });
    }
}

const handleUserActiveStatus = async (req, res) => {
    const { state } = req.query;
    const refreshToken = req.cookies?.jwt;

    const foundUser = await User.findOne({ refreshToken: refreshToken });
    try {
        foundUser.active = state;
        await foundUser.save();
        res.status(200).json({ message: `${foundUser.username} has been ${(Number(state)) ? 'activated' : 'deactivated'}` });
    } catch (err) {
        res.status(500).json({ message: err.errors });
    }
}

const handleGetUserById = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'missing user id' });

    const foundUser = await User.findById(id);
    if (!foundUser) return res.status(404).json({ message: `no user match this id: ${id}` });

    res.status(302).json({ foundUser });
}

export default {
    handleUserDelete,
    handleUserActiveStatus,
    handleGetUserById,
};
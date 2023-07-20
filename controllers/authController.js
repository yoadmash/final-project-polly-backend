import dotenv from 'dotenv';
dotenv.config();

import { User } from '../model/User.js';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const handleRegister = async (req, res) => {
    const { username, password, email, firstname, lastname } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'missing username or password' });
    if (!firstname || !lastname) return res.status(400).json({ message: 'missing firstname or lastname' });
    if (!email) return res.status(400).json({ message: 'missing email' });

    const duplicate = await User.findOne({ $or: [{ username: username }, { email: email }] });
    if (duplicate) return res.status(409).json({ message: `a user using this username: \'${username}\' or this email: \'${email}\' already exists` });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            firstname: firstname,
            lastname: lastname,
            username: username,
            password: hashedPassword,
            email: email
        });
        res.status(201).json({ message: `register complete` });
    } catch (err) {
        res.status(500).json({ message: err.errors });
    }
}

const handleLogin = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'missing username or password' });

    const userExists = await User.findOne({ username: username }).select('+password');
    if (!userExists) return res.status(404).json({ message: `${username} doesn't exist` });

    bcrypt.compare(password, userExists.password, async (err, same) => {
        if (same) {
            try {
                const accessToken = jwt.sign(
                    { "username": userExists.username },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: '30m' }
                );
                const refreshToken = jwt.sign(
                    { "username": userExists.username },
                    process.env.REFRESH_TOKEN_SECRET,
                    { expiresIn: '30d' }
                );
                userExists.refreshToken = refreshToken;
                await userExists.save();
                res.cookie('jwt', refreshToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); //secure: true, sameSite: 'None'
                res.json({ message: `login complete`, accessToken: accessToken });
            } catch {
                res.status(500).text(err);
            }
        } else return res.status(401).json({ message: "wrong password" });
    });
}

const handleLogout = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204);

    const refreshToken = cookies.jwt;
    const userExists = await User.findOne({ refreshToken: refreshToken });
    if (userExists) {
        userExists.refreshToken = null;
        await userExists.save();
    }
    res.clearCookie('jwt', { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.sendStatus(204);

}

const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);

    const refreshToken = cookies.jwt;
    const userExists = await User.findOne({ refreshToken: refreshToken });
    if (!userExists) return res.sendStatus(403);

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decodedJWT) => {
            if (err || userExists.username !== decodedJWT.username) return res.sendStatus(403);
            const accessToken = jwt.sign(
                { "username": decodedJWT.username },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '30m' }
            );
            res.json({ accessToken });
        });
}

export default {
    handleRegister,
    handleLogin,
    handleLogout,
    handleRefreshToken,
}
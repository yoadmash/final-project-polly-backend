import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuid } from 'uuid';
import { User } from '../model/User.js';
import { format } from 'date-fns';
import { log } from '../utils/log.js';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const handleRegister = async (req, res) => {
    const { username, password, email, firstname, lastname } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Missing username or password' });
    if (!firstname || !lastname) return res.status(400).json({ message: 'Missing firstname or lastname' });
    if (!email) return res.status(400).json({ message: 'Missing email' });

    const duplicate = await User.findOne({ $or: [{ username: username }, { email: email }] }).select('+password');
    if (duplicate) {
        if (!duplicate.active) {
            bcrypt.compare(password, duplicate.password, async (err, same) => {
                if (same) {
                    try {
                        duplicate.active = true;
                        await duplicate.save();
                        res.status(200).json({ message: 'user activated' });
                        log(`${duplicate.username} (id: ${duplicate.id}) has been activated`, 'usersLog');
                    } catch {
                        res.status(500).send(err);
                    }
                } else return res.status(401).json({ message: "Username or password are incorrect" });
            });
        } else {
            return res.status(409).json({ message: `A user using this username: \'${username}\' or this email: \'${email}\' already exists` });
        }
    } else {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = await User.create({
                _id: uuid(),
                firstname: firstname,
                lastname: lastname,
                username: username,
                password: hashedPassword,
                email: email,
                registered_at: format(Date.now(), 'dd/MM/yyyy')
            });
            res.status(201).json({ message: `Registration Complete` });
            log(`${newUser.username} (id: ${newUser.id}) has been registered`, 'authLog');
        } catch (err) {
            res.status(500).json({ message: err.errors });
        }
    }
}

const handleLogin = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(401).json({ message: 'Missing username or password' });

    const foundUser = await User.findOne({ username: username }).select('+password');
    if (!foundUser) return res.status(401).json({ message: 'Username or password are incorrect' });
    if (!foundUser.active) return res.status(401).json({ message: `User '${foundUser.username}' is deactivated. To activate the user, please Sign Up with the same username and password` });

    bcrypt.compare(password, foundUser.password, async (err, same) => {
        if (same) {
            try {
                const accessToken = jwt.sign(
                    { "id": foundUser.id },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: '30m' }
                );
                const refreshToken = jwt.sign(
                    { "id": foundUser.id },
                    process.env.REFRESH_TOKEN_SECRET,
                    { expiresIn: '7d' }
                );
                foundUser.refreshToken = refreshToken;
                await foundUser.save();
                res.cookie('jwt', refreshToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, secure: true, sameSite: 'None' }); //secure: true, sameSite: 'None'
                const fullname = (foundUser.firstname === foundUser.lastname) ? `${foundUser.firstname.charAt(0).toUpperCase() + foundUser.firstname.slice(1)}` : `${foundUser.firstname.charAt(0).toUpperCase() + foundUser.firstname.slice(1)} ${foundUser.lastname.charAt(0).toUpperCase() + foundUser.lastname.slice(1)}`;
                res.json({
                    message: `Login Complete`, userData: {
                        userId: foundUser.id,
                        fullname: fullname,
                        accessToken: accessToken,
                        profile_pic_path: foundUser.profile_pic_path
                    }
                });
                log(`${foundUser.username} (id: ${foundUser.id}) has been logged in`, 'authLog');
            } catch {
                res.status(500).send(err);
            }
        } else return res.status(401).json({ message: "Username or password are incorrect" });
    });
}

const handleLogout = async (req, res) => {
    const refreshToken = req.cookies?.jwt;
    const foundUser = await User.findOne({ refreshToken: refreshToken });
    if (foundUser) {
        foundUser.refreshToken = '';
        await foundUser.save();
    }
    res.clearCookie('jwt', { httpOnly: true, secure: true, sameSite: 'None' }); //secure: true, sameSite: 'None'
    res.sendStatus(204);
    log(`${foundUser.username} (id: ${foundUser.id}) has been logged out`, 'authLog');
}

const handleRefreshToken = async (req, res) => {
    const refreshToken = req.cookies?.jwt;
    if (!refreshToken) return res.sendStatus(401);
    const foundUser = await User.findOne({ refreshToken: refreshToken });
    if (!foundUser) return res.sendStatus(401);

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decodedJWT) => {
            if (err || foundUser.id !== decodedJWT.id) return res.sendStatus(403);
            const accessToken = jwt.sign(
                { "id": decodedJWT.id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '30m' }
            );
            const fullname = (foundUser.firstname === foundUser.lastname) ? `${foundUser.firstname.charAt(0).toUpperCase() + foundUser.firstname.slice(1)}` : `${foundUser.firstname.charAt(0).toUpperCase() + foundUser.firstname.slice(1)} ${foundUser.lastname.charAt(0).toUpperCase() + foundUser.lastname.slice(1)}`;
            res.json({
                userData: {
                    userId: foundUser.id,
                    username: foundUser.username,
                    fullname: fullname,
                    accessToken: accessToken,
                    profile_pic_path: foundUser.profile_pic_path
                }
            });
        }
    );

    // log(`a new access token has been issued to ${foundUser.username} (id: ${foundUser.id})`, 'authLog');
}

export default {
    handleRegister,
    handleLogin,
    handleLogout,
    handleRefreshToken,
}
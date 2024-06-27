import dotenv from 'dotenv';
import cookie from 'cookie';
dotenv.config();

import { v4 as uuid } from 'uuid';
import { User } from '../model/User.js';
import { format } from 'date-fns';
import { logToDB } from '../utils/log.js';
import { sendEmail } from '../utils/email.js';

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
                        logToDB({
                            user_id: duplicate.id,
                            user_name: duplicate.username,
                            log_message: 'user activated',
                            log_type: 'users'
                        }, false);
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
            logToDB({
                user_id: newUser.id,
                user_name: newUser.username,
                log_message: 'user registered',
                log_type: 'auth'
            }, false);
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
    if (foundUser.registered_by_google) return res.status(401).json({ message: 'Please sign in with your Google account' });

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
                foundUser.last_login = format(Date.now(), 'dd/MM/yyyy, HH:mm:ss');
                foundUser.refreshToken = refreshToken;
                foundUser.resetPassToken = '';
                await foundUser.save();
                res.setHeader('Set-Cookie', cookie.serialize('jwt', refreshToken, {
                    path: '/',
                    httpOnly: true,
                    maxAge: 24 * 60 * 60 * 7,
                    secure: true,
                    sameSite: 'None',
                    partitioned: true
                }));
                const fullname = (foundUser.firstname === foundUser.lastname)
                    ? `${foundUser.firstname.charAt(0).toUpperCase() + foundUser.firstname.slice(1)}`
                    : `${foundUser.firstname.charAt(0).toUpperCase() + foundUser.firstname.slice(1)} ${foundUser.lastname.charAt(0).toUpperCase() + foundUser.lastname.slice(1)}`;
                res.json({
                    message: `Login Complete`, userData: {
                        userId: foundUser.id,
                        fullname: fullname,
                        accessToken: accessToken,
                        admin: foundUser.admin,
                        profile_pic_path: foundUser.profile_pic_path,
                        polls_created: foundUser.polls_created,
                        registered_by_google: foundUser.registered_by_google,
                    }
                });
                logToDB({
                    user_id: foundUser.id,
                    user_name: foundUser.username,
                    log_message: 'user logged in',
                    log_type: 'auth'
                }, false);
            } catch {
                res.status(500).send(err);
            }
        } else return res.status(401).json({ message: "Username or password are incorrect" });
    });
}

const handleGoogleAuth = async (req, res) => {
    const { firstname, lastname, username, email } = req.body;
    if (!firstname || !lastname || !username || !email) return res.status(400).json({ message: 'Missing firstname / lastname / username / email' });

    let user = await User.findOne({ email });
    if (user && !user.registered_by_google) return res.status(401).json({ message: 'Please sign in with your username and password' });
    if(!user.active) return res.status(401).json({message: 'This user is deactivated'});

    try {
        if (!user) {
            user = await User.create({
                _id: uuid(),
                firstname,
                lastname,
                username,
                email,
                password: await bcrypt.hash(username, 10),
                resetPassToken: '',
                registered_at: format(Date.now(), 'dd/MM/yyyy'),
                last_login: format(Date.now(), 'dd/MM/yyyy, HH:mm:ss'),
                registered_by_google: true,
            });
        }

        const accessToken = jwt.sign(
            { "id": user.id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '30m' }
        );
        const refreshToken = jwt.sign(
            { "id": user.id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        user.refreshToken = refreshToken;
        await user.save();

        const fullname = (user.firstname === user.lastname)
            ? `${user.firstname.charAt(0).toUpperCase() + user.firstname.slice(1)}`
            : `${user.firstname.charAt(0).toUpperCase() + user.firstname.slice(1)} ${user.lastname.charAt(0).toUpperCase() + user.lastname.slice(1)}`;

        res.setHeader('Set-Cookie', cookie.serialize('jwt', refreshToken, {
            path: '/',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 7,
            secure: true,
            sameSite: 'None',
            partitioned: true
        }));

        res.status(201).json({
            message: `Auth Complete`, userData: {
                userId: user.id,
                fullname: fullname,
                username: user.username,
                accessToken: accessToken,
                admin: user.admin,
                profile_pic_path: '',
                polls_created: user.polls_created,
                registered_by_google: user.registered_by_google,
            }
        });

        logToDB({
            user_id: user.id,
            user_name: user.username,
            log_message: 'by google',
            log_type: 'auth'
        }, false);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const handleLogout = async (req, res) => {
    const refreshToken = cookie.parse(req.headers.cookie || '')?.jwt;
    const foundUser = await User.findOne({ refreshToken: refreshToken });
    if (foundUser) {
        foundUser.refreshToken = '';
        await foundUser.save();
    }
    res.sendStatus(204);
    logToDB({
        user_id: foundUser?.id,
        user_name: foundUser?.username,
        log_message: 'user logged out',
        log_type: 'auth'
    }, false);

}

const handleRefreshToken = async (req, res) => {
    const refreshToken = cookie.parse(req.headers.cookie || '')?.jwt;
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
                { expiresIn: '15m' }
            );
            const fullname = (foundUser.firstname === foundUser.lastname)
                ? `${foundUser.firstname.charAt(0).toUpperCase() + foundUser.firstname.slice(1)}`
                : `${foundUser.firstname.charAt(0).toUpperCase() + foundUser.firstname.slice(1)} ${foundUser.lastname.charAt(0).toUpperCase() + foundUser.lastname.slice(1)}`;
            res.json({
                userData: {
                    userId: foundUser.id,
                    username: foundUser.username,
                    fullname: fullname,
                    accessToken: accessToken,
                    admin: foundUser.admin,
                    profile_pic_path: foundUser.profile_pic_path,
                    polls_created: foundUser.polls_created,
                    registered_by_google: foundUser.registered_by_google,
                }
            });
        }
    );
}

const handleForgotPassword = async (req, res) => {
    const { emailAddress } = req.body;
    const foundUser = await User.findOne({ email: emailAddress });

    if (!foundUser) return res.status(404).json({ message: 'User not found' });
    if(foundUser.registered_by_google) return res.status(401).json({message: 'Unable to reset password because this user was signed up with Google'});

    let resetPassToken = ''
    try {
        resetPassToken = jwt.sign(
            { "id": foundUser.id },
            process.env.RESET_PASS_TOKEN_SECRET,
            { expiresIn: "10m" }
        );

        foundUser.resetPassToken = resetPassToken;
        foundUser.save();

    } catch (err) {
        return res.status(400).json({ message: 'Failed to issue reset password token' });
    }

    const resetPassLink = `<a href=${process.env.FRONT_URL + `/auth/reset_password?t=${resetPassToken}`}>Reset Password</a>`

    const emailMessage = `
    <div style="font-size: 20px; text-align: center;">
        <p>
            Hi ${foundUser.username},<br>
            A reset password request as been issued for you.<br>
            Please follow the link below to reset your password (the link is valid for the next 10 minutes).<br>
            ${resetPassLink}
        </p>
    </div>
    `;

    sendEmail({
        "from": "Polly <yoad.studies@gmail.com>",
        "to": emailAddress,
        "subject": "Reset Password Request",
        "html": emailMessage
    });

    logToDB({
        user_id: foundUser.id,
        user_name: foundUser.username,
        log_type: 'auth',
        log_message: 'reset password request'
    }, false);

    res.json({ message: 'reset password email has been sent' });
}

const handleChangePassword = async (req, res) => {
    const { resetPassToken, password, matchPassword } = req.body;

    const foundUser = await User.findById(req.user).select('password resetPassToken');
    if (!foundUser) return res.status(404).json({ message: 'User not found' });
    if (foundUser.resetPassToken !== resetPassToken) return res.status(401).json({ message: 'Link expired or already used to change the password' });
    if (password !== matchPassword) return res.status(400).json({ message: 'Password mismatch' });

    bcrypt.compare(password, foundUser.password, async (err, same) => {
        if (err) return res.status(500).json(err);
        if (same) {
            return res.status(409).json({ message: 'New password can\'t match current password' });
        } else {
            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                foundUser.password = hashedPassword;
                foundUser.resetPassToken = '';
                foundUser.save();
            } catch (error) {
                res.status(500).json(error);
            }
        }
        res.json({ message: 'Password changed' });
    })

}

export default {
    handleRegister,
    handleLogin,
    handleGoogleAuth,
    handleLogout,
    handleRefreshToken,
    handleForgotPassword,
    handleChangePassword
}
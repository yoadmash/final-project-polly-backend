import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const cookies = req.cookies;
    if (!authHeader || !cookies?.jwt) return res.status(401).json({ message: 'something is wrong' });

    const token = authHeader.split(' ')[1];

    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decodedJWT) => {
            if (err) return res.status(403).json({ message: 'invalid token' });
            req.user = decodedJWT.username;
            next();
        }
    )
}

export { verifyJWT }
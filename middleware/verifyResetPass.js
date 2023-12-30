import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';

const verifyResetPass = (req, res, next) => {
    const { resetPassToken } = req.body;

    jwt.verify(
        resetPassToken,
        process.env.RESET_PASS_TOKEN_SECRET,
        (err, decodedJWT) => {
            if (err) return res.status(403).json({ message: 'Invalid link' });
            req.user = decodedJWT.id;
            next();
        }
    )
}

export { verifyResetPass }
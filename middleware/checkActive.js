import { User } from '../model/User.js';

const checkActive = async (req, res, next) => {
    const foundUser = await User.findById(req.user);
    if(!foundUser?.active) return res.status(401).json({ message: 'user is deactivated' });
    next();
}

export { checkActive }
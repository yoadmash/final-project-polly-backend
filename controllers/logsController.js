import { User } from '../model/User.js';
import { Log } from '../model/Log.js';

const handleGetLogs = async (req, res) => {
    const { log, clear } = req.query;
    const foundUser = await User.findById(req.user);

    if (!foundUser?.admin) return res.status(401).json({ message: 'You\'re not and Admin' });

    if (log) {
        if(clear) {
            await Log.deleteMany({log_type: log});
            res.sendStatus(200);
        } else {
            const log_data = await Log.find({ log_type: log }).select('-_id -log_type').sort({'date_time': -1});
            res.status(log_data.length > 0 ? 200 : 204).json({ content: log_data });
        }
    } else {
        const log_types = await Log.distinct('log_type');
        res.json({ log_types });
    }

}

export default {
    handleGetLogs
}
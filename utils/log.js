import { Log } from '../model/Log.js';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';

const logToDB = async (log_obj, is_error) => {
    const logged_at = `${format(new Date(), 'dd/MM/yyy, HH:mm:ss')}`;

    const SAVE_LOGS = true;
    if(SAVE_LOGS) {
        try {
            await Log.create({ _id: uuid(), ...log_obj, is_error, logged_at });
        } catch (err) {
            console.log(err);
        }
    }

}

export { logToDB }
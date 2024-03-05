import { Log } from '../model/Log.js';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';

const logToDB = async (log_obj, is_error) => {
    const date = `${format(new Date(), 'dd/MM/yyyy')}`;
    const time = `${format(new Date(), 'HH:mm:ss')}`;

    const SAVE_LOGS = process.env.SAVE_LOGS;
    if(SAVE_LOGS === 'true') {
        try {
            await Log.create({ _id: uuid(), ...log_obj, is_error, date_time: date + " " + time });
        } catch (err) {
            console.log(err);
        }
    }

}

export { logToDB }
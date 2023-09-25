import { format } from 'date-fns';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { v4 as uuid } from 'uuid';
import path from 'path';
import dirname_filename from './dirname_filename.js';

const { __dirname } = dirname_filename(import.meta);

const log = async (logMsg, logName) => {
    const dateTime = `${format(new Date(), 'dd/MM/yyy, HH:mm:ss')}`;
    const formattedLogMsg = `[${uuid()} : ${dateTime}] => ${logMsg}\n\n`;
    
    const SAVE_LOGS = true;
    if(SAVE_LOGS) {
        try {
            if (!fs.existsSync(path.join(__dirname, '..', 'logs'))) {
                await fsPromises.mkdir(path.join(__dirname, '..', 'logs'));
            }
            await fsPromises.appendFile(path.join(__dirname, '..', 'logs', `${logName}.txt`), formattedLogMsg);
        } catch (err) {
            console.log(err);
        }
    }
}

export { log }
import fs from 'fs';
import path from 'path';
import dirname_filename from '../utils/dirname_filename.js';

const { __dirname } = dirname_filename(import.meta);

const handleShowLogs = async (req, res) => {
    const { logFileName } = req.params;
    fs.readFile(path.join(__dirname, '..', 'logs', `${logFileName}Log.txt`), (err, data) => {
        if (err) {
            res.status(404).send('log not found');
            return;
        }
        res.status(200).send(`<textarea style="width: 100%; height: 100%; resize: none;" disabled>${data.toString()}</textarea>`);
    });
}

export default {
    handleShowLogs
}
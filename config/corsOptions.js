import { allowedOrigins } from './allowedOrigins.js';

export const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) { //remove origin to block localhost requests
            callback(null, true);
        } else {
            callback(new Error(origin + ' is not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200
}
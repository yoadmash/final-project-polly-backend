import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { corsOptions } from './config/corsOptions.js';
import { connectDB } from './config/dbConnect.js';

import usersRouter from './routes/usersRouter.js'
import pollsRouter from './routes/pollsRouter.js'
import logsRouter from './routes/logsRouter.js';
import { credentials } from './middleware/credentials.js';

//server init
const app = express();
const PORT = process.env.PORT || 3500;
await connectDB();

//middleware
app.use(credentials);
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('./public'));

//routes
app.use('^/$|/home', (req, res) => {
    res.redirect(process.env.FRONT_URL);
});

app.use('/users', usersRouter);
app.use('/polls', pollsRouter);
app.use('/logs', logsRouter);

app.all('*', (req, res) => {
    res.status(404).send('There\'s nothing here...');
});

//server listen
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
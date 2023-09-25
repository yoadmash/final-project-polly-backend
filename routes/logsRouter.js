import express from 'express';
import logsController from '../controllers/logsController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const logsRouter = express.Router();
const regex = '^/'

// logsRouter.use(verifyJWT);
logsRouter.route(regex + ':logFileName').get(logsController.handleShowLogs);

export default logsRouter;
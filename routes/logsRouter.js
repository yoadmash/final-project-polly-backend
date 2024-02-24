import express from 'express';
import logsController from '../controllers/logsController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { checkActive } from '../middleware/checkActive.js';

const logsRouter = express.Router();
const regex = '^/'

logsRouter.use(verifyJWT, checkActive);
logsRouter.route(regex).get(logsController.handleGetLogs);

export default logsRouter;
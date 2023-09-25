import express from 'express';
import pollsController from '../controllers/pollsController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const pollsRouter = express.Router();
const regex = '^/'

pollsRouter.use(verifyJWT);
pollsRouter.route(regex + 'create').post(pollsController.handlePollCreate);
pollsRouter.route(regex + 'delete').post(pollsController.handlePollDelete);
pollsRouter.route(regex + 'edit').post(pollsController.handlePollEdit);
pollsRouter.route(regex + 'rename').post(pollsController.handlePollRename);
pollsRouter.route(regex + 'create').post(pollsController.handlePollCreate);
pollsRouter.route(regex + 'get_poll_answers').get(pollsController.handleGetPollAnswers);
pollsRouter.route(regex + ':id').get(pollsController.handleGetPollById);

export default pollsRouter;
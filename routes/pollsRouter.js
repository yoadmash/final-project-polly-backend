import express from 'express';
import pollsController from '../controllers/pollsController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import fileUpload from 'express-fileupload';
import { fileExtLimiter } from '../middleware/fileExtLimiter.js';
import { fileSizeLimiter } from '../middleware/fileSizeLimiter.js';

const pollsRouter = express.Router();
const regex = '^/'

pollsRouter.use(verifyJWT);

pollsRouter.route(regex + 'create').post(
    fileUpload({ createParentPath: true }),
    fileExtLimiter(['.png', '.jpg', '.jpeg', '.svgz', '.svg']),
    fileSizeLimiter,
    pollsController.handlePollCreate);

pollsRouter.route(regex + 'delete').post(pollsController.handlePollDelete);
pollsRouter.route(regex + 'answer_poll').post(pollsController.handleAnswerPoll);
pollsRouter.route(regex + 'search').post(pollsController.handleSearchPolls);
pollsRouter.route(regex + 'visit').post(pollsController.handleVisitPoll);
pollsRouter.route(regex + ':id').get(pollsController.handleGetPollById);

pollsRouter.route(regex + ':id/edit').post(
    fileUpload({ createParentPath: true }),
    fileExtLimiter(['.png', '.jpg', '.jpeg', '.svgz', '.svg']),
    fileSizeLimiter,
    pollsController.handlePollEdit);

pollsRouter.route(regex + ':id/get_poll_answers').get(pollsController.handleGetPollAnswers);

export default pollsRouter;
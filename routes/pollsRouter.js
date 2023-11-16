import express from 'express';
import fileUpload from 'express-fileupload';
import pollsController from '../controllers/pollsController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { fileExtLimiter } from '../middleware/fileExtLimiter.js';
import { filePayLoadExists } from '../middleware/filePayLoadExists.js';
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
pollsRouter.route(regex + 'edit').post(pollsController.handlePollEdit);
pollsRouter.route(regex + 'rename').post(pollsController.handlePollRename);
pollsRouter.route(regex + 'answer_poll').post(pollsController.handleAnswerPoll);
pollsRouter.route(regex + 'get_poll_answers').get(pollsController.handleGetPollAnswers);
pollsRouter.route(regex + ':id').get(pollsController.handleGetPollById);

export default pollsRouter;
import express from 'express';
import pollsController from '../controllers/pollsController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { checkActive } from '../middleware/checkActive.js';
import fileUpload from 'express-fileupload';
import { fileExtLimiter } from '../middleware/fileExtLimiter.js';
import { fileSizeLimiter } from '../middleware/fileSizeLimiter.js';

const pollsRouter = express.Router();
const regex = '^/'

pollsRouter.use(verifyJWT, checkActive);

pollsRouter.route(regex + 'templates').get(pollsController.handleGetTemplates);
pollsRouter.route(regex + 'templates/create').post(pollsController.handleCreateTemplate);
pollsRouter.route(regex + 'templates/:id').get(pollsController.handleGetTemplateById);
pollsRouter.route(regex + 'templates/:id/edit').post(pollsController.handleEditTemplate);
pollsRouter.route(regex + 'templates/delete').post(pollsController.handleDeleteTemplate);
pollsRouter.route(regex + 'templates/show-or-hide').post(pollsController.handleShowOrHideTemplate);

pollsRouter.route(regex + 'create').post(
    fileUpload({ createParentPath: true }),
    fileExtLimiter(['.png', '.jpg', '.jpeg', '.svgz', '.svg']),
    fileSizeLimiter,
    pollsController.handlePollCreate);

pollsRouter.route(regex + 'delete').post(pollsController.handlePollDelete);
pollsRouter.route(regex + 'answer_poll').post(pollsController.handleAnswerPoll);
pollsRouter.route(regex + 'search').post(pollsController.handleSearchPolls);
pollsRouter.route(regex + 'get_all_polls').get(pollsController.handleGetAllPolls);
pollsRouter.route(regex + ':id/change_owner').post(pollsController.handleChangeOwner);
pollsRouter.route(regex + 'visit').post(pollsController.handleVisitPoll);
pollsRouter.route(regex + ':id').get(pollsController.handleGetPollById);

pollsRouter.route(regex + ':id/edit').post(
    fileUpload({ createParentPath: true }),
    fileExtLimiter(['.png', '.jpg', '.jpeg', '.svgz', '.svg']),
    fileSizeLimiter,
    pollsController.handlePollEdit);

pollsRouter.route(regex + ':id/get_poll_answers').get(pollsController.handleGetPollAnswers);
pollsRouter.route(regex + ':id/clear_answers').post(pollsController.handleClearPollAnswers);

export default pollsRouter;
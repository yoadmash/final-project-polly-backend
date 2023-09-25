import express from 'express';
import fileUpload from 'express-fileupload';
import authController from '../controllers/authController.js';
import userController from '../controllers/usersController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { fileExtLimiter } from '../middleware/fileExtLimiter.js';
import { filePayLoadExists } from '../middleware/filePayLoadExists.js';
import { fileSizeLimiter } from '../middleware/fileSizeLimiter.js';


const usersRouter = express.Router();
const regex = '^/'

usersRouter.route(regex + 'auth/register').post(authController.handleRegister);
usersRouter.route(regex + 'auth/login').post(authController.handleLogin);
usersRouter.route(regex + 'auth/refresh').get(authController.handleRefreshToken);
usersRouter.route(regex + 'auth/logout').get(authController.handleLogout);

usersRouter.use(verifyJWT);

usersRouter.route(regex + 'upload').post(
    fileUpload({ createParentPath: true }),
    filePayLoadExists,
    fileExtLimiter(['.png', '.jpg', '.jpeg', '.svgz', '.svg']),
    fileSizeLimiter,
    userController.handleProfilePictureUpload);

usersRouter.route(regex + 'remove_profile_pic').post(userController.handleRemoveProfilePicture);
usersRouter.route(regex + 'delete').post(userController.handleUserDelete);
usersRouter.route(regex + 'set_active').post(userController.handleUserActiveStatus);
usersRouter.route(regex + 'get_polls').get(userController.handleGetUserPolls);
usersRouter.route(regex + ':id').get(userController.handleGetUserById);

export default usersRouter;
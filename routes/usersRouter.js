import express from 'express';
import fileUpload from 'express-fileupload';
import authController from '../controllers/authController.js';
import userController from '../controllers/usersController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { checkActive } from '../middleware/checkActive.js';
import { verifyResetPass } from '../middleware/verifyResetPass.js';
import { fileExtLimiter } from '../middleware/fileExtLimiter.js';
import { filePayLoadExists } from '../middleware/filePayLoadExists.js';
import { fileSizeLimiter } from '../middleware/fileSizeLimiter.js';


const usersRouter = express.Router();
const regex = '^/'

usersRouter.route(regex + 'auth/register').post(authController.handleRegister);
usersRouter.route(regex + 'auth/login').post(authController.handleLogin);
usersRouter.route(regex + 'auth/google').post(authController.handleGoogleAuth);
usersRouter.route(regex + 'auth/refresh').get(authController.handleRefreshToken);
usersRouter.route(regex + 'auth/logout').get(authController.handleLogout);
usersRouter.route(regex + 'auth/reset-password').post(authController.handleForgotPassword);
usersRouter.route(regex + 'auth/change-password').post(verifyResetPass, authController.handleChangePassword);

usersRouter.use(verifyJWT, checkActive);

usersRouter.route(regex + 'upload').post(
    fileUpload({ createParentPath: true }),
    filePayLoadExists,
    fileExtLimiter(['.png', '.jpg', '.jpeg', '.svgz', '.svg']),
    fileSizeLimiter,
    userController.handleProfilePictureUploadExternal);

usersRouter.route(regex + 'remove_profile_pic').post(userController.handleRemoveProfilePictureExternal);
usersRouter.route(regex + 'set_active').post(userController.handleUserActiveStatus);
usersRouter.route(regex + 'set_admin').post(userController.handleUserAdminStatus);
usersRouter.route(regex + 'get_polls').get(userController.handleGetUserPolls);
usersRouter.route(regex + 'get_all_users').get(userController.handleGetAllUsers);
usersRouter.route(regex + ':id').get(userController.handleGetUserById);

export default usersRouter;
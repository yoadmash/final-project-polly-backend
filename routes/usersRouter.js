import express from 'express';
import authController from '../controllers/authController.js';
import userController from '../controllers/usersController.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const usersRouter = express.Router();
const regex = '^/'

usersRouter.route(regex + 'auth/register').post(authController.handleRegister);
usersRouter.route(regex + 'auth/login').post(authController.handleLogin);
usersRouter.route(regex + 'auth/logout').get(authController.handleLogout);

usersRouter.use(verifyJWT);
usersRouter.route(regex + 'auth/refresh').get(authController.handleRefreshToken);
usersRouter.route(regex + 'delete').post(userController.handleUserDelete);
usersRouter.route(regex + 'set_active').post(userController.handleUserActiveStatus);
usersRouter.route(regex + ':id').get(userController.handleGetUserById);

export default usersRouter;
import express from 'express';
import * as authController from "../controllers/user.controller.js";
import * as validationRules from "../middlewares/validation.middleware.js";
import passport from 'passport';

const router = express.Router();

router.post("/register", validationRules.registerUserValidationRules, authController.register);
router.post("/login", validationRules.loginUserValidationRules, authController.login);

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  authController.googleAuthCallback
);

export default router;
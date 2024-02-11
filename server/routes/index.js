import express from 'express'

import { routeAuthOptions } from './auth-options.js';
import {
  routeRegisterWithPassword,
  routeLoginWithPassword,
} from './password-login.js';
import { routeLoginGoogle } from './google-login.js';
import {
  routeWebAuthRegistrationOptions,
  routeWebAuthRegistrationVerification,
} from './webauth-registration.js';
import {
  routeWebAuthLoginOptions,
  routeWebAuthLoginVerification,
} from './webauth-login.js';

export const router = express.Router();

router.post('/auth/auth-options', routeAuthOptions);
router.post('/auth/register', routeRegisterWithPassword);
router.post('/auth/login', routeLoginWithPassword);
router.post('/auth/login-google', routeLoginGoogle);
router.post('/auth/webauth-registration-options', routeWebAuthRegistrationOptions);
router.post('/auth/webauth-registration-verification', routeWebAuthRegistrationVerification);
router.post('/auth/webauth-login-options', routeWebAuthLoginOptions);
router.post('/auth/webauth-login-verification', routeWebAuthLoginVerification);

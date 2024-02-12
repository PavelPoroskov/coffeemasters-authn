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
// router.post('/auth/confirm-email', );
//  1) on registration send link in email (random string and email to table email-to-check)
//  2) user click link to '/auth/confirm-email?ver=random-string-from-step1'
//      find this string in table email-to-check
//      mark email as verified
//  ?can use magic link
router.post('/auth/login', routeLoginWithPassword);
// router.post('/auth/forgot-password', );
// router.post('/auth/reset-password', );
//  user can change password. ?temp token

router.post('/auth/login-google', routeLoginGoogle);
router.post('/auth/webauth-registration-options', routeWebAuthRegistrationOptions);
router.post('/auth/webauth-registration-verification', routeWebAuthRegistrationVerification);
router.post('/auth/webauth-login-options', routeWebAuthLoginOptions);
router.post('/auth/webauth-login-verification', routeWebAuthLoginVerification);

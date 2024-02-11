import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import { getConfig } from '../getConfig.js'
import { findUser } from "../connectDb.js";

const CONFIG = getConfig();

export const routeWebAuthLoginOptions = async (req, res) => {
  const user = findUser(req.body.email);
  // if (user==null) {
  //     res.sendStatus(404);
  //     return;
  // }
  const options = {
      timeout: 60000,
      allowCredentials: [],
      devices: user && user.devices ? user.devices.map(dev => ({
        id: dev.credentialID,
        type: 'public-key',
        transports: dev.transports,
      })) : [],
      userVerification: 'required',
      rpID: CONFIG.rpID,
  };
  const loginOpts = await SimpleWebAuthnServer.generateAuthenticationOptions(options);

  if (user) { 
    user.currentChallenge = loginOpts.challenge;
  }

  res.send(loginOpts);
};

export const routeWebAuthLoginVerification = async (req, res) => {
  const data = req.body.data;
  const user = findUser(req.body.email);
  if (!user) {
      res.sendStatus(400).send({ok: false});
      return;
  } 

  const expectedChallenge = user.currentChallenge;

  let dbAuthenticator;
  const bodyCredIDBuffer = isoBase64URL.toBuffer(data.rawId);

  for (const dev of user.devices) {
    // const currentCredential = Buffer(dev.credentialID.data);
    // if (bodyCredIDBuffer.equals(currentCredential)) {
    if (isoUint8Array.areEqual(dev.credentialID, bodyCredIDBuffer)) {
      dbAuthenticator = dev;
      break;
    }
  }

  if (!dbAuthenticator) {
    return res.status(400).send({ ok: false, message: 'Authenticator is not registered with this site' });
  }

  let verification;
  try {
    const options  = {
      credential: data,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin: CONFIG.expectedOrigin,
      expectedRPID: CONFIG.rpID,
      authenticator: {
          ...dbAuthenticator,
          credentialPublicKey: Buffer.from(dbAuthenticator.credentialPublicKey.data) // Re-convert to Buffer from JSON
      },
      requireUserVerification: true,
    };
    verification = await SimpleWebAuthnServer.verifyAuthenticationResponse(options);
  } catch (error) {
    return res.status(400).send({ ok: false, message: error.toString() });
  }

  const { verified, authenticationInfo } = verification;

  if (verified) {
    dbAuthenticator.counter = authenticationInfo.newCounter;
    //? save
  }

  res.send({ 
      ok: true, 
      user: {
          name: user.name, 
          email: user.email
      }
  });
};

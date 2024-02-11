import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { getConfig } from '../getConfig.js'
import { findUser, db } from '../connectDb.js';

const CONFIG = getConfig();

export const routeWebAuthRegistrationOptions = async (req, res) =>{
  const user = findUser(req.body.email);

  const options = {
      rpName: 'Coffee Masters',
      rpID: CONFIG.rpID,
      userID: user.email,
      userName: user.name,
      timeout: 60000,
      attestationType: 'none',
      
      /**
       * Passing in a user's list of already-registered authenticator IDs here prevents users from
       * registering the same device multiple times. The authenticator will simply throw an error in
       * the browser if it's asked to perform registration when one of these ID's already resides
       * on it.
       */
      excludeCredentials: user.devices ? user.devices.map(dev => ({
          id: dev.credentialID,
          type: 'public-key',
          transports: dev.transports,
      })) : [],

      authenticatorSelection: {
          userVerification: 'required', 
          residentKey: 'required',
      },
      /**
       * The two most common algorithms: ES256, and RS256
       */
      supportedAlgorithmIDs: [-7, -257],
  };

  /**
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify an authenticator response.
   */
  const regOptions = await SimpleWebAuthnServer.generateRegistrationOptions(options)

  // TODO https://github.com/MasterKale/SimpleWebAuthn/tree/master/example store in session
  user.currentChallenge = regOptions.challenge;
  db.write();
  
  res.send(regOptions);
};

export const routeWebAuthRegistrationVerification = async (req, res) => {
  const user = findUser(req.body.email);
  const data = req.body.data;

  const expectedChallenge = user.currentChallenge;

  let verification;
  try {
    const options = {
      credential: data,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin: CONFIG.expectedOrigin,
      expectedRPID: CONFIG.rpID,
      requireUserVerification: true,
    };
    verification = await SimpleWebAuthnServer.verifyRegistrationResponse(options);
  } catch (error) {
    console.log(error);
    return res.status(400).send({ error: error.toString() });
  }

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credentialPublicKey, credentialID, counter } = registrationInfo;

    const existingDevice = user.devices ? user.devices.find(
      // device => Buffer.from(device.credentialID.data).equals(credentialID)
      (device) => isoUint8Array.areEqual(device.credentialID, credentialID)
    ) : false;

    if (!existingDevice) {
      const newDevice = {
        credentialPublicKey,
        credentialID,
        counter,
        transports: data.transports,
      };
      if (user.devices==undefined) {
          user.devices = [];
      }
      user.webauthn = true;
      user.devices.push(newDevice);
      db.write();
    }
  }

  res.send({ ok: true });
};

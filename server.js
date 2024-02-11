import express from 'express'
import { JSONFilePreset } from 'lowdb/node'
import * as url from 'url';
import bcrypt from 'bcryptjs';
// weekly downloads 2000
import * as jwtJsDecode from 'jwt-js-decode';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const db = await JSONFilePreset(__dirname + '/auth.json', {
  users: [],
});

const rpID = "localhost";
const protocol = "http";
const port = 5050;
const expectedOrigin = `${protocol}://${rpID}:${port}`;

const app = express()
app.use(express.json())
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

const findUser = (email) => db.data.users.find((u) => u.email === email);

// ADD HERE THE REST OF THE ENDPOINTS
app.post('/auth/register',(req,res) => {
  // TODO sanitize name, email
  // TODO validation: json-schema in fastify
  // validation
  //  is email empty
  //  is name empty
  //  res.status(400)
  const validatedInput = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  }
  
  const userFound = findUser(validatedInput.email);

  // TODO status code
  if (userFound) {
    res.status(400);
    res.send({
      ok: false,
      message: 'User already exists',
    });
  } else {
    // TODO use async api bcrypt
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(validatedInput.password, salt);

    db.data.users.push({
      // TODO sanitize name, email before writing to database
      name: validatedInput.name,
      email: validatedInput.email,
      hashedPassword,
    });
    db.write();

    res.status(200);
    res.send({
      ok: true,
    });
  }
});

app.post('/auth/auth-options',(req,res) => {
  const userFound = findUser(req.body.email);

  if (userFound) {
    res.send({
      password: userFound.hashedPassword !== false,
      google: userFound.google,
      webauthn: userFound.webauthn,
    });
  } else {
    res.send({
      password: true,
    });
  }
});

app.post('/auth/login-google',(req,res) => {
  // TODO verify jwt using secret https://www.npmjs.com/package/jwt-js-decode
  const jwt = jwtJsDecode.decode(req.body.credential);
  const user = {
    name: jwt.payload.given_name + ' ' + jwt.payload.family_name,
    email: jwt.payload.email,
    hashedPassword: false,
  }

  const userFound = findUser(user.email);

  if (userFound) {
    userFound.google = jwt.payload.aud;
    db.write();
    res.send({
      ok: true,
      name: user.name,
      email: user.email,
    });
  } else {
    db.data.users.push({
      ...user,
      google: jwt.payload.aud,
    });
    db.write();
    res.send({
      ok: true,
      name: user.name,
      email: user.email,
    });
  }
});

app.post('/auth/login',(req,res) => {
  // TODO validation
  const validatedInput = {
    email: req.body.email,
    password: req.body.password,
  }

  const userFound = findUser(validatedInput.email);

  if (userFound) {
    if (bcrypt.compareSync(validatedInput.password, userFound.hashedPassword)) {

      res.status(200);
      res.send({
        ok: true,
        name: userFound.name,
      });
    } else {
      res.status(400);
      res.send({
        ok: false,
        message: 'Credentials are wrong.',
      });
    }
  } else {
    res.status(400);
    res.send({
      ok: false,
      message: 'Credentials are wrong.',
    });
  }
});

app.post("/auth/webauth-registration-options", async (req, res) =>{
  const user = findUser(req.body.email);

  const options = {
      rpName: 'Coffee Masters',
      rpID,
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
});

app.post("/auth/webauth-registration-verification", async (req, res) => {
  const user = findUser(req.body.email);
  const data = req.body.data;

  const expectedChallenge = user.currentChallenge;

  let verification;
  try {
    const options = {
      credential: data,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID,
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
});

app.post("/auth/webauth-login-options", async (req, res) =>{
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
      rpID,
  };
  const loginOpts = await SimpleWebAuthnServer.generateAuthenticationOptions(options);

  if (user) { 
    user.currentChallenge = loginOpts.challenge;
  }

  res.send(loginOpts);
});

app.post("/auth/webauth-login-verification", async (req, res) => {
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
      expectedOrigin,
      expectedRPID: rpID,
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
});

app.get("*", (req, res) => {
    res.sendFile(__dirname + "public/index.html"); 
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
});


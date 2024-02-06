import express from 'express'
import { JSONFilePreset } from 'lowdb/node'
import * as url from 'url';
import bcrypt from 'bcryptjs';
// weekly downloads 2000
import * as jwtJsDecode from 'jwt-js-decode';
// import base64url from "base64url";
import '@simplewebauthn/server';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const db = await JSONFilePreset(__dirname + '/auth.json', {
  users: [],
});

// const rpID = "localhost";
// const protocol = "http";
const port = 5050;
// const expectedOrigin = `${protocol}://${rpID}:${port}`;

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

app.get("*", (req, res) => {
    res.sendFile(__dirname + "public/index.html"); 
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
});


import express from 'express'
import { JSONFilePreset } from 'lowdb/node'
import * as url from 'url';
import bcrypt from 'bcryptjs';
import * as jwtJsDecode from 'jwt-js-decode';
import base64url from "base64url";
import '@simplewebauthn/server';

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
  // TODO validation: json-schema in fastify
  // validation
  //  is email empty
  //  is name empty
  //  res.status(400)
  const user = {
    name: req.body.register_name,
    email: req.body.register_email,
    password: req.body.register_password,
  }
  
  const userFound = findUser(user.email);

  // TODO status code
  if (userFound) {
    res.status(400);
    res.send({
      ok: false,
      message: 'User already exists',
    });
  } else {
    db.data.users.push(user);
    db.write();

    res.status(200);
    res.send({
      ok: true,
    });
  }
});

app.get("*", (req, res) => {
    res.sendFile(__dirname + "public/index.html"); 
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
});


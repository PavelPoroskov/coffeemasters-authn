// TODO use other lib: weekly downloads 2000
import * as jwtJsDecode from 'jwt-js-decode';
import { findUser, db } from "../connectDb.js";

export const routeLoginGoogle = (req,res) => {
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
};

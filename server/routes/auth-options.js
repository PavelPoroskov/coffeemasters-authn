import { findUser } from "../connectDb.js";

export const routeAuthOptions = (req,res) => {
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
};

import bcrypt from 'bcryptjs';
import { findUser, db } from "../connectDb.js";

export const routeRegisterWithPassword = (req,res) => {
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
};

export const routeLoginWithPassword = (req,res) => {
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
};

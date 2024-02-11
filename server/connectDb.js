import { JSONFilePreset } from 'lowdb/node'
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('..', import.meta.url));

export const db = await JSONFilePreset(__dirname + '/auth.json', {
  users: [],
});

export const findUser = (email) => db.data.users.find((u) => u.email === email);


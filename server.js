import express from 'express'
import * as url from 'url';
import { getConfig } from './server/getConfig.js'
import { router } from './server/routes/index.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const CONFIG = getConfig();

const app = express()
app.use(express.json())
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

app.use(router);

app.get("*", (req, res) => {
    res.sendFile(__dirname + "public/index.html"); 
});

app.listen(CONFIG.PORT, () => {
  console.log(`App listening on port ${CONFIG.PORT}`)
});


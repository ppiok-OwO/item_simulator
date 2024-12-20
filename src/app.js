import express from 'express';
import cookieParser from 'cookie-parser';
import AccountsRouter from './routes/accounts.router.js';
import CharactersRouter from './routes/characters.router.js';
import ItemsRouter from './routes/Items.router.js';
import ClassesRouter from './routes/classes.router.js';
import ShopRouter from './routes/shop.router.js';
import errorHandlerMiddleware from './middlewares/error-handler.middleware.js';

const app = express();
const PORT = 3018;

app.use(express.json());
app.use(cookieParser());

app.use('/api', [
  AccountsRouter,
  CharactersRouter,
  ItemsRouter,
  ClassesRouter,
  ShopRouter,
]);

app.use(errorHandlerMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});

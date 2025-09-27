import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import healthRoutes from './routes/health';
import constsRoutes from './routes/consts';
import userRoutes from './routes/users';
import tabGroupRoutes from './routes/tabGroups';
import tabRoutes from './routes/tabs';
import environmentRoutes from './routes/environments';
import faviconRoutes from './routes/favicons';

const app = express();
const apiRouter = express.Router();

const defaultOrigins = ['http://localhost:4200'];
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : defaultOrigins;

const corsOptions = {
  origin: configuredOrigins.includes('*') ? true : configuredOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'user_id'],
};

app.set('etag', false);
app.use(cors(corsOptions));
app.use(express.json());

apiRouter.get('/', (_req: Request, res: Response) => {
  res.send('Welcome to the FlightDeck API!');
});

apiRouter.use('/health', healthRoutes);
apiRouter.use('/consts', constsRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/tab-groups', tabGroupRoutes);
apiRouter.use('/tabs', tabRoutes);
apiRouter.use('/environments', environmentRoutes);
apiRouter.use('/favicons', faviconRoutes);

app.use('/api', apiRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export { app };

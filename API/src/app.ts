import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import healthRoutes from './routes/health';
import constsRoutes from './routes/consts';
import userRoutes from './routes/users';
import tabGroupRoutes from './routes/tabGroups';
import tabRoutes from './routes/tabs';
import environmentRoutes from './routes/environments';

const app = express();

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

app.get('/', (_req: Request, res: Response) => {
  res.send('Welcome to the FlightDeck API!');
});

app.use('/health', healthRoutes);
app.use('/consts', constsRoutes);
app.use('/users', userRoutes);
app.use('/tab-groups', tabGroupRoutes);
app.use('/tabs', tabRoutes);
app.use('/environments', environmentRoutes);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export { app };

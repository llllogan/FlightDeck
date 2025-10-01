import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health';
import constsRoutes from './routes/consts';
import userRoutes from './routes/users';
import tabGroupRoutes from './routes/tabGroups';
import tabRoutes from './routes/tabs';
import environmentRoutes from './routes/environments';
import faviconRoutes from './routes/favicons';
import searchRoutes from './routes/search';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';

const app = express();
const apiRouter = express.Router();

const defaultOrigins = ['http://localhost:4200', 'http://flightdeck.site', 'https://flightdeck.site'];
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : defaultOrigins;

const allowedHeaders = ['Content-Type', 'x-user-id', 'Authorization'];

const corsOptions = {
  origin: configuredOrigins.includes('*') ? true : configuredOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders,
  credentials: true,
};

app.set('etag', false);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

apiRouter.get('/', (_req: Request, res: Response) => {
  res.send('Welcome to the FlightDeck API!');
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/health', healthRoutes);
apiRouter.use('/consts', constsRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/tab-groups', tabGroupRoutes);
apiRouter.use('/tabs', tabRoutes);
apiRouter.use('/environments', environmentRoutes);
apiRouter.use('/favicons', faviconRoutes);
apiRouter.use('/search', searchRoutes);
apiRouter.use('/admin', adminRoutes);

app.use('/api', apiRouter);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error) {
    console.error(`[error] ${req.method} ${req.originalUrl}: ${err.message}`, err.stack);
  } else {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  }
  res.status(500).json({ error: 'Internal server error' });
});

export { app };

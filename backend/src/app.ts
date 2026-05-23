import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { logger } from './utils/logger';
import apiRouter from './routes/api';
import { startWorkers } from './jobs/workers';

// Prevent process crashes due to uncaught errors or unhandled promise rejections
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message || err}`, err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Security settings
app.use(helmet());
app.use(cors({
  origin: '*', // In production, replace with specific frontend origin URLs
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting: 100 requests per 15 minutes max
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Setup Morgan HTTP logger integration with Winston
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message: string) => logger.http(message.trim()),
  }
}));

// Bind APIs
app.use('/api', apiRouter);

// Health Check API
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Centralized error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`${req.method} ${req.url} - Error: ${err.message || err}`);
  
  const status = err.status || 500;
  return res.status(status).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
});

// Start Background Queue Workers
startWorkers();

// Listen Server
app.listen(PORT, () => {
  logger.info(`BookHive Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;
// Trigger reload 2


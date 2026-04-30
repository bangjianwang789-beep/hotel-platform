import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import brandsRouter from './routes/brands.js';
import evaluationRouter from './routes/evaluation.js';
import reportsRouter from './routes/reports.js';
import investorsRouter from './routes/investors.js';
import authRouter from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/brands', brandsRouter);
app.use('/api', evaluationRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/investors', investorsRouter);
app.use('/api/auth', authRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

export default app;

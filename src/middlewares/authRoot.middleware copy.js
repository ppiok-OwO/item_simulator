import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { prisma } from '../utils/prisma/index.js';

dotenv.config();


import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/** 클래스 생성 API */
router.post('/classes', authMiddleware, async (req, res, next) => {
  // 클래스 이름, 클래스 체력, 클래스 전투력, 클래스 스피드를 request로 전달받기
  const { className, classHp, classPower, classSpeed } = req.body;

  const character_class = await prisma.classes.create({
    data: {
      className,
      classHp: +classHp,
      classPower: +classPower,
      classSpeed: +classSpeed,
    },
  });

  return res.status(201).json({ data: character_class });
});

/** 클래스 조회 API */

/** 클래스 수정 API */

export default router;

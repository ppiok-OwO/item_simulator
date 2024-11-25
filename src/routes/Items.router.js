import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/** 아이템 생성 API */
router.post('/items', authMiddleware, async (req, res, next) => {
  // 아이템 코드, 이름, 스탯, 가격을 request로 전달받기
  const { itemCode, itemName, itemStat, itemPrice, classId } = req.body;

  const item = await prisma.items.create({
    data: {
      itemCode: +itemCode,
      itemName,
      itemStat,
      itemPrice: +itemPrice,
      classId: +classId,
    },
  });

  return res.status(201).json({ data: item });
});

/** 아이템 조회 API */

/** 아이템 수정 API */

export default router;

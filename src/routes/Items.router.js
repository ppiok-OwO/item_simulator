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

  try {
    if (!itemCode || !itemName || !itemStat | !itemPrice || !classId) {
      return res.status(400).json({ message: '모든 필드를 입력해 주세요.' });
    }

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
  } catch (err) {
    next(err);
  }
});

/** 클래스별 기본 아이템 생성 API */
router.post('/basicitems', authMiddleware, async (req, res, next) => {
  // 아이템 코드, 이름, 스탯, 가격을 request로 전달받기
  const { itemId, classId } = req.body;
  // 운영자만이 클래스별 기본 아이템을 추가할 수 있다.
  const { adminId, adminPassword } = req.body;

  try {
    // 데이터 유효성 검사
    if (!itemId || !classId) {
      return res.status(400).json({ message: '모든 필드를 입력해 주세요.' });
    }
    // 운영자 권한 확인
    if (
      !(
        adminId === process.env.ADMIN_ID &&
        adminPassword === process.env.ADMIN_PASSWORD
      )
    ) {
      return res.status(400).json({ message: '권한을 가지고 있지 않습니다.' });
    }

    const basicitem = await prisma.basicItems.create({
      data: {
        itemId: +itemId,
        classId: +classId,
      },
    });

    return res.status(201).json({ data: basicitem });
  } catch (err) {
    next(err);
  }
});

/** 아이템 조회 API */

/** 아이템 수정 API */

export default router;

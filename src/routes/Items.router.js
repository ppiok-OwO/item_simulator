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
    // 데이터 유효성 검사
    if (!itemCode || !itemName || !itemStat | !itemPrice || !classId) {
      return res.status(400).json({ message: '모든 필드를 입력해 주세요.' });
    }

    // 아이템 레코드 생성
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
  // 아이템 id, 클래스 id를 request로 전달받기
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

/** 아이템 목록 조회 API */
router.get('/items', async (req, res, next) => {
  try {
    // 아이템 코드, 아이템 명, 아이템 가격 조회
    const itemList = await prisma.items.findMany({
      select: {
        itemCode: true,
        itemName: true,
        itemPrice: true,
      },
      orderBy: { itemCode: 'asc' },
    });

    return res.status(200).json({
      itemList,
    });
  } catch (err) {
    next(err);
  }
});

/** 아이템 상세 조회 API */
// 아이템 코드, 아이템 명, 아이템 능력, 아이템 가격 조회
router.get('/items/:itemCode', async (req, res, next) => {
  const { itemCode } = req.params;

  try {
    // 아이템 코드 유효성 검사
    const item = await prisma.items.findFirst({
      where: { itemCode: +itemCode },
    });
    if (!item) {
      return res
        .status(404)
        .json({ message: '존재하지 않는 아이템 코드입니다.' });
    }

    return res.status(200).json({
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemStat: item.itemStat,
      itemPrice: item.itemPrice,
    });
  } catch (err) {
    next(err);
  }
});

/** 아이템 수정 API */
router.patch('/items/:itemCode', authMiddleware, async (req, res, next) => {
  const { itemCode } = req.params;
  const { itemName, itemStat } = req.body;
  const { adminId, adminPassword } = req.body;

  try {
    // 운영자 권한 확인
    if (
      !(
        adminId === process.env.ADMIN_ID &&
        adminPassword === process.env.ADMIN_PASSWORD
      )
    ) {
      return res.status(400).json({ message: '권한을 가지고 있지 않습니다.' });
    }

    // 아이템 코드 유효성 검사
    const item = await prisma.items.findFirst({
      where: { itemCode: +itemCode },
    });
    if (!item) {
      return res
        .status(404)
        .json({ message: '존재하지 않는 아이템 코드입니다.' });
    }

    // 아이템 이름과 스탯을 비운 경우도 고려
    const data = {};
    if (itemName) data.itemName = itemName;
    if (itemStat) data.itemStat = itemStat;
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: '수정할 데이터가 없습니다.' });
    }

    await prisma.items.updateMany({
      where: { itemCode: +itemCode },
      data: data,
    });

    const updatedItem = await prisma.items.findFirst({
      where: { itemCode: +itemCode },
    });

    return res.status(200).json({
      message: '아이템이 성공적으로 수정되었습니다.',
      data: updatedItem,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

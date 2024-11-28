import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/** 아이템 생성 API */
router.post('/items', authMiddleware, async (req, res, next) => {
  try {
    // 아이템 코드, 이름, 스탯, 가격을 request로 전달받기
    const { itemCode, itemName, itemStat, itemPrice, classId } = req.body;
    const { userId } = req.locals;
    const user = await prisma.accounts.findUnique({
      where: { userId },
    });

    if (!itemCode || !itemName || !itemStat | !itemPrice || !classId) {
      return res.status(400).json({
        message:
          '아이템 코드, 아이템 이름, 아이템 스탯, 아이템 가격, 클래스ID를 입력해 주세요.',
      });
    }

    // 일반 유저는 기존에 존재하던 아이템만 생성할 수 있다.
    if (!user.isAdmin) {
      const isValidItem = await prisma.items.findFirst({
        where: {
          itemCode: +itemCode,
          itemName,
          itemStat,
          itemPrice: +itemPrice,
          classId: +classId,
        },
      });
      if (!isValidItem) {
        return res
          .status(400)
          .json({ message: '생성할 수 없는 아이템입니다.' });
      }
    }

    // 운영자는 새로운 아이템을 추가할 수 있다.
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

/** 클래스별 기본 아이템 설정 API */
router.patch('/basicitems', authMiddleware, async (req, res, next) => {
  try {
    // 아이템 id, 클래스 id를 request로 전달받기
    const { itemId, classId } = req.body;
    // 운영자만이 클래스별 기본 아이템을 설정할 수 있다.
    const { userId } = req.locals;
    const user = await prisma.accounts.findUnique({
      where: { userId },
    });

    if (!itemId || !classId) {
      return res
        .status(400)
        .json({ message: '아이템ID와 클래스ID를 입력해 주세요.' });
    }
    // 운영자 권한 확인
    if (!user.isAdmin) {
      return res.status(403).json({ message: '권한을 가지고 있지 않습니다.' });
    }

    const item = await prisma.items.findFirst({
      where: { itemId: +itemId },
    });

    const basicitem = await prisma.basicItems.update({
      where: { classId: +classId },
      data: {
        itemId: item.itemId,
        classId: item.classId,
        itemCode: item.itemCode,
      },
    });

    return res.status(201).json({ data: basicitem });
  } catch (err) {
    next(err);
  }
});

//===============================/
/** 아이템 목록 조회 API */
router.get('/items', async (req, res, next) => {
  try {
    // 아이템 코드, 아이템 명, 아이템 가격 조회
    const itemList = await prisma.items.findMany({
      select: {
        itemId: true,
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

//==========================/
/** 아이템 수정 API */
router.patch('/items/:itemCode', authMiddleware, async (req, res, next) => {
  try {
    const { itemCode } = req.params;
    const { itemName, itemStat } = req.body;
    const { userId } = req.locals;
    const user = await prisma.accounts.findUnique({ where: { userId } });

    // 운영자 권한 확인
    if (!user.isAdmin) {
      return res.status(403).json({ message: '권한을 가지고 있지 않습니다.' });
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

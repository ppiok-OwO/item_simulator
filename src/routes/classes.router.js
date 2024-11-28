import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma/index.js';
import dotenv from 'dotenv';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();
dotenv.config();

/** 클래스 생성 API */
router.post('/classes', authMiddleware, async (req, res, next) => {
  try {
    // 클래스 이름, 클래스 체력, 클래스 전투력, 클래스 스피드, 클래스 쿨다운을 request로 전달받기
    const { className, classHp, classPower, classSpeed, classCoolDown } =
      req.body;
    // 운영자만이 클래스를 추가할 수 있다.
    const { userId } = req.locals;
    const user = await prisma.accounts.findUnique({
      where: { userId },
    });

    if (!className || !classHp || !classPower || !classSpeed) {
      return res.status(400).json({
        message:
          '클래스 이름, 클래스 기본 체력, 클래스 기본 전투력, 클래스 기본 속도를 입력해주세요.',
      });
    }
    // 운영자 권한 확인
    if (!user.isAdmin) {
      return res.status(403).json({ message: '권한을 가지고 있지 않습니다.' });
    }

    // 클래스 생성
    const characterClass = await prisma.classes.create({
      data: {
        className,
        classHp: +classHp,
        classPower: +classPower,
        classSpeed: +classSpeed,
        classCoolDown: +classCoolDown,
      },
    });

    return res.status(201).json({
      message: '클래스가 성공적으로 생성되었습니다.',
      data: characterClass,
    });
  } catch (err) {
    next(err);
  }
});

/** 클래스 조회 API */
router.get('/classes', async (req, res, next) => {
  try {
    const classes = await prisma.classes.findMany({
      select: {
        classId: true,
        className: true,
        classHp: true,
        classPower: true,
        classSpeed: true,
        classCoolDown: true,
      },
    });

    return res.status(200).json(classes);
  } catch (err) {
    next(err);
  }
});

/** 클래스 수정 API */
router.patch('/classes/:classId', authMiddleware, async (req, res, next) => {
  const { classId } = req.params;
  const { className, classHp, classPower, classSpeed, classCoolDown } =
    req.body;
  const { userId } = req.locals;

  try {
    const user = await prisma.accounts.findUnique({
      where: { userId },
    });
    if (!user.isAdmin) {
      return res.status(403).json({
        message: '권한을 가지고 있지 않습니다.',
      });
    }

    const existingClass = await prisma.classes.findUnique({
      where: { classId: +classId },
    });

    await prisma.classes.update({
      where: { classId: +classId },
      data: {
        className: className ?? existingClass.className,
        classHp: classHp !== undefined ? +classHp : existingClass.classHp,
        classPower:
          classPower !== undefined ? +classPower : existingClass.classPower,
        classSpeed:
          classSpeed !== undefined ? +classSpeed : existingClass.classSpeed,
        classCoolDown:
          classCoolDown !== undefined
            ? +classCoolDown
            : existingClass.classCoolDown,
      },
    });

    const updatedClass = await prisma.classes.findFirst({
      where: { classId: +classId },
      select: {
        classId: true,
        className: true,
        classHp: true,
        classPower: true,
        classSpeed: true,
        classCoolDown: true,
      },
    });

    return res.status(201).json(updatedClass);
  } catch (err) {}
});

export default router;

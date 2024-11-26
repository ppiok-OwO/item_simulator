import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();
dotenv.config();

/** 클래스 생성 API */
router.post('/classes', authMiddleware, async (req, res, next) => {
  // 클래스 이름, 클래스 체력, 클래스 전투력, 클래스 스피드, 클래스 쿨다운을 request로 전달받기
  const { className, classHp, classPower, classSpeed, classCoolDown } =
    req.body;
  // 운영자만이 클래스를 추가할 수 있다.
  const { adminId, adminPassword } = req.body;

  try {
    // 데이터 유효성 검사
    if (!className || !classHp || !classPower || !classSpeed) {
      return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
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

    const characterClass = await prisma.classes.create({
      data: {
        className,
        classHp: +classHp,
        classPower: +classPower,
        classSpeed: +classSpeed,
        classCoolDown: +classCoolDown,
      },
    });

    return res
      .status(201)
      .json({
        message: '클래스가 성공적으로 생성되었습니다.',
        data: characterClass,
      });
  } catch (err) {
    next(err);
  }
});

/** 클래스 조회 API */

/** 클래스 수정 API */

export default router;

import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import authMiddleware from '../middlewares/auth.middleware.js';

dotenv.config();

const router = express.Router();

/** 캐릭터 생성 API */
router.post('/characters', authMiddleware, async (req, res, next) => {
  const { characterName, classId } = req.body;
  const { user } = req.locals.user;

  // 필수 입력값을 모두 받았는지 확인
  if (!characterName || !classId || !characterName.trim()) {
    return res.status(400).json({ error: '캐릭터 정보를 모두 입력해 주세요.' });
  }

  // 캐릭터 이름 유효성 검사
  if (characterName.length > 15) {
    return res.status(400).json({
      error: '캐릭터 이름은 15글자를 넘을 수 없습니다.',
    });
  }

  // 캐릭터 이름이 중복되는지 검사
  const isExitCharacterName = await prisma.characters.findFirst({
    where: { characterName },
  });
  if (isExitCharacterName) {
    return res
      .status(400)
      .json({ message: '이미 존재하는 캐릭터 이름입니다.' });
  }

  // 클래스 유효성 검사(Classes테이블에 존재하는가?)
  const isExitClassId = await prisma.classes.findFirst({
    where: { classId },
  });
  if (!isExitClassId) {
    return res.status(400).json({ message: '존재하지 않는 클래스입니다.' });
  }

  const class = 

  const character = await prisma.characters.create({
    data: {
        characterName,
        characterHp: 
    }
  })

  // 끝
});

/** 캐릭터 상세 조회 API */

/** 캐릭터 삭제 API */

export default router;

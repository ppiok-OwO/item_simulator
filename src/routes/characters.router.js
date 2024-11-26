import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authMiddleware from '../middlewares/auth.middleware.js';

dotenv.config();

const router = express.Router();

/** 캐릭터 생성 API */
router.post('/characters', authMiddleware, async (req, res, next) => {
  const { characterName, classId } = req.body;
  const { userId } = req.locals;

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
    where: { classId: +classId },
  });
  if (!isExitClassId) {
    return res.status(400).json({ message: '존재하지 않는 클래스입니다.' });
  }

  const { character, basicItem } = await prisma.$transaction(
    async (tx) => {
      // 캐릭터 생성
      const character = await tx.characters.create({
        data: {
          characterName,
          characterHp: isExitClassId.classHp,
          characterPower: isExitClassId.classPower,
          characterSpeed: isExitClassId.classSpeed,
          accountId: user.accountId,
        },
      });

      // 기본 아이템 조회
      const basicItem = await tx.basicItems.findFirst({
        where: { classId: +classId },
      });
      if (!basicItem) {
        return res
          .status(400)
          .json({ error: '기본 아이템이 존재하지 않습니다.' });
      }

      // 기본 아이템 장착
      await tx.characterItems.create({
        data: {
          characterId: character.characterId,
          itemId: basicItem.itemId,
        },
      });

      return { character, basicItem };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );

  // 아이템의 스탯만큼을 캐릭터에게 부여하기
  const item = await prisma.items.findFirst({
    where: { itemId: basicItem.itemId },
  });
  const updatedCharacter = await prisma.characters.findUnique({
    where: { characterId: character.characterId },
  });
  await prisma.characters.update({
    where: { characterId: character.characterId },
    data: {
      characterHp: updatedCharacter.characterHp + item.itemStat.hp,
      characterPower: updatedCharacter.characterPower + item.itemStat.power,
    },
  });

  return res.status(201).json({
    message: '캐릭터 생성 및 기본 아이템 장착이 완료되었습니다.',
    character,
  });
  // 끝
});

/** 캐릭터 상세 조회 API */

/** 캐릭터 삭제 API */

export default router;

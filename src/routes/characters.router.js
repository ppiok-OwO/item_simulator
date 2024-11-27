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
  const user = await prisma.accounts.findUnique({
    where: { userId },
  });

  try {
    // 필수 입력값을 모두 받았는지 확인
    if (!characterName || !classId || !characterName.trim().length === 0) {
      return res
        .status(400)
        .json({ error: '캐릭터 정보를 모두 입력해 주세요.' });
    }

    // 캐릭터 이름 유효성 검사
    if (characterName.length > 15) {
      return res.status(400).json({
        error: '캐릭터 이름은 15글자를 넘을 수 없습니다.',
      });
    }
    if (typeof characterName !== 'string') {
      return res.status(400).json({
        error: '캐릭터 이름은 문자열 형태여야 합니다.',
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

    // 클래스 ID를 숫자로 변환
    const classIdNumber = +classId;
    if (isNaN(classIdNumber)) {
      return res.status(400).json({ error: '유효하지 않은 클래스 ID입니다.' });
    }

    const { character, item } = await prisma.$transaction(
      async (tx) => {
        // 클래스 유효성 검사(유저가 선택한 클래스Id가 Classes테이블에 존재하는가?)
        const isExitClassId = await prisma.classes.findFirst({
          where: { classId: classIdNumber },
        });
        if (!isExitClassId) {
          return res
            .status(400)
            .json({ message: '존재하지 않는 클래스입니다.' });
        }

        // 캐릭터 생성
        const character = await tx.characters.create({
          data: {
            characterName,
            characterHp: isExitClassId.classHp,
            characterPower: isExitClassId.classPower,
            characterSpeed: isExitClassId.classSpeed,
            characterCoolDown: isExitClassId.classCoolDown,
            accountId: user.accountId,
            classId: classIdNumber,
          },
        });

        // 선택한 클래스의 기본 아이템 조회
        const basicItem = await tx.basicItems.findFirst({
          where: { classId: classIdNumber },
        });
        if (!basicItem) {
          return res.status(400).json({
            error: '선택한 클래스의 기본 아이템이 존재하지 않습니다.',
          });
        }

        // 조회한 기본 아이템의 id를 바탕으로, 해당 아이템의 데이터를 가져온다.
        const { itemCode, itemName, itemStat, itemPrice, classId } =
          await tx.items.findFirst({
            where: { itemId: basicItem.itemId },
          });
        // 아이템 테이블에 새 캐릭터가 장착할 기본 아이템 생성
        const item = await tx.items.create({
          data: {
            itemCode,
            itemName,
            itemStat,
            itemPrice,
            classId,
          },
        });

        // 기본 아이템 장착
        await tx.characterItems.create({
          data: {
            characterId: character.characterId,
            itemId: item.itemId,
          },
        });

        return { character, item };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    // 아이템 장착하기
    try {
      await equipItem(character, item);
    } catch (err) {
      return next(err);
    }

    return res.status(201).json({
      message: '캐릭터 생성 및 기본 아이템 장착이 완료되었습니다.',
      character: {
        name: character.characterName,
        hp: character.characterHp,
        power: character.characterPower,
        speed: character.characterSpeed,
        cooldown: character.characterCoolDown,
        money: character.characterMoney,
      },
    });
    // 끝
  } catch (err) {
    next(err);
  }
});

/**=========================================== */
/** 아이템 장착하기 함수 */
export async function equipItem(character, item) {
  // 업데이트된 DB를 반영하여 캐릭터를 불러온다.
  const updatedCharacter = await prisma.characters.findUnique({
    where: { characterId: character.characterId },
  });

  if (!updatedCharacter) {
    throw new Error('존재하지 않는 캐릭터입니다.');
  }

  // 아이템의 스탯만큼 캐릭터에게 부여
  return prisma.characters.update({
    where: { characterId: character.characterId },
    data: {
      characterHp: updatedCharacter.characterHp + (item.itemStat.hp || 0),
      characterPower:
        updatedCharacter.characterPower + (item.itemStat.power || 0),
      characterCoolDown:
        updatedCharacter.characterCoolDown + (item.itemStat.cd || 0),
      characterSpeed:
        updatedCharacter.characterSpeed + (item.itemStat.speed || 0),
    },
  });
}

/**========================================== */
/** 캐릭터 상세 조회 API */
router.get('/characters/:characterId', async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const authorization = req.headers.authorization;

    // 캐릭터 조회 (기본 정보 + 소유자 정보 포함)
    const character = await prisma.characters.findUnique({
      where: { characterId: +characterId },
    });
    if (!character) {
      return res.status(404).json({ message: '존재하지 않는 캐릭터입니다.' });
    }

    // 기본 응답 데이터
    let data = {
      characterName: character.characterName,
      characterHp: character.characterHp,
      characterPower: character.characterPower,
      characterSpeed: character.characterSpeed,
      characterCoolDown: character.characterCoolDown,
    };

    // 토큰 검증(await 실수를 했던 곳!!! - 트러블 슈팅 참고)
    // const user = verifyToken(authorization);
    const user = await verifyToken(authorization);

    // 본인의 캐릭터인 경우 추가 정보 포함
    if (user && character.accountId === user.accountId) {
      data = { ...data, characterMoney: character.characterMoney };
    }

    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

/**====================================== */
/** 토큰 검증 함수 */
async function verifyToken(authorization) {
  // 토큰이 없으면 null 반환
  if (!authorization || authorization.trim().length === 0) return null;

  // 잘못된 형식의 토큰이면 null 반환
  const [tokenType, token] = authorization.split(' ');
  if (tokenType !== 'Bearer' || !token) return null;

  try {
    // 토큰이 검증을 통과 했을 때 사용자 계정 데이터를 반환
    const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
    const user = await prisma.accounts.findUnique({
      where: { userId: decodedToken.userId },
    });
    return user || null;
  } catch (error) {
    return null; // 그 밖의 경우 모두 null 반환
  }
}

/**========================================= */
/** 캐릭터 삭제 API */
router.delete(
  '/characters/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { characterId } = req.params;
      const { userId } = req.locals;

      // 계정 존재 여부 다시 확인(authMiddleware에서 authorization 헤더를 통해 토큰을 검증하긴 하지만 혹시 모르니까...!)
      const user = await prisma.accounts.findUnique({
        where: { userId },
      });
      if (!user) {
        return res
          .status(401)
          .json({ message: '로그인 계정이 존재하지 않습니다.' });
      }

      // 캐릭터 존재 여부 확인
      const character = await prisma.characters.findUnique({
        where: { characterId: +characterId },
      });
      if (!character) {
        return res.status(404).json({ message: '존재하지 않는 캐릭터입니다.' });
      }

      // 계정 일치 여부
      if (character.accountId !== user.accountId) {
        return res.status(403).json({
          message: '다른 계정이 소유한 캐릭터는 삭제할 수 없습니다.',
        });
      }

      // 캐릭터 삭제
      await prisma.characters.delete({
        where: {
          characterId: character.characterId,
        },
      });

      return res.status(200).json({
        message: '삭제가 완료되었습니다.',
      });
    } catch (err) {
      next(err);
    }
  },
);

/**========================================= */
/** 캐릭터가 장착한 아이템 조회 API */
router.get('/charactersItem/:characterId', async (req, res, next) => {
  const { characterId } = req.params;

  try {
    const characterItem = await prisma.characterItems.findMany({
      where: { characterId: +characterId },
      select: {
        item: {
          select: {
            itemCode: true,
            itemName: true,
            itemStat: true,
            itemPrice: true,
            class: {
              select: {
                className: true,
              },
            },
          },
        },
      },
    });
    if (!characterItem) {
      return res.status(404).json({ message: '존재하지 않는 캐릭터입니다.' });
    }

    return res.status(200).json({
      characterItem,
    });
  } catch (err) {
    next(err);
  }
});

/**========================================= */
/** 캐릭터 인벤토리 조회 */
router.get('/charactersInventory/:characterId', async (req, res, next) => {
  const { characterId } = req.params;

  try {
    const characterItem = await prisma.characterInventory.findMany({
      where: { characterId: +characterId },
      select: {
        item: {
          select: {
            itemCode: true,
            itemName: true,
            itemStat: true,
            itemPrice: true,
            class: {
              select: {
                className: true,
              },
            },
          },
        },
      },
    });
    if (!characterItem) {
      return res.status(404).json({ message: '존재하지 않는 캐릭터입니다.' });
    }

    return res.status(200).json({
      characterItem,
    });
  } catch (err) {
    next(err);
  }
});

/**========================================= */
/** 아이템 장착 API */

export default router;

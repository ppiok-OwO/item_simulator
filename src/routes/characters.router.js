import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma/index.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import authMiddleware from '../middlewares/auth.middleware.js';

dotenv.config();

const router = express.Router();

/** 캐릭터 생성 API */
router.post('/characters', authMiddleware, async (req, res, next) => {
  try {
    const { characterName, classId } = req.body;
    const { userId } = req.locals;
    const user = await prisma.accounts.findUnique({
      where: { userId },
    });
    // 필수 입력값을 모두 받았는지 확인
    if (!characterName || !classId || !characterName.trim().length === 0) {
      return res
        .status(400)
        .json({ error: '생성할 캐릭터의 이름과 클래스ID를 입력해 주세요.' });
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

    const { updatedCharacter } = await prisma.$transaction(
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
        // 캐릭터가 이미 장착한 아이템은 아닌지 확인
        const isEquippedItem = await tx.characterItems.findFirst({
          where: {
            itemCode: basicItem.itemCode,
            characterId: character.characterId,
          },
        });
        if (isEquippedItem) {
          return res.status(400).json('이미 착용 중인 아이템입니다.');
        }

        // 조회한 기본 아이템의 id를 바탕으로, 해당 아이템의 데이터를 가져온다.
        const { itemCode, itemName, itemStat, itemPrice, classId } =
          await tx.items.findFirst({
            where: { itemCode: basicItem.itemCode },
          });
        // 아이템 테이블에 새 캐릭터가 장착할 기본 아이템 생성
        const item = await tx.items.create({
          data: {
            itemCode,
            itemName,
            itemStat,
            itemPrice,
            classId,
            characterId: character.characterId,
          },
        });

        // 아이템 장착하기
        await equipItem(tx, character, item);

        // 업데이트된 DB를 반영하여 캐릭터를 불러온다.
        const updatedCharacter = await tx.characters.findUnique({
          where: { characterId: character.characterId },
        });

        return { updatedCharacter };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    return res.status(201).json({
      message: '캐릭터 생성 및 기본 아이템 장착이 완료되었습니다.',
      character: {
        name: updatedCharacter.characterName,
        hp: updatedCharacter.characterHp,
        power: updatedCharacter.characterPower,
        speed: updatedCharacter.characterSpeed,
        cooldown: updatedCharacter.characterCoolDown,
        money: updatedCharacter.characterMoney,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**=========================================== */
/** 아이템 장착하기 함수 */
export async function equipItem(tx, character, item) {
  // 캐릭터 아이템 테이블에 레코드 생성
  await tx.characterItems.create({
    data: {
      characterId: character.characterId,
      itemId: item.itemId,
    },
  });
  // 아이템의 스탯만큼 캐릭터에게 부여
  await tx.characters.update({
    where: { characterId: character.characterId },
    data: {
      characterHp: character.characterHp + (item.itemStat.hp || 0),
      characterPower: character.characterPower + (item.itemStat.power || 0),
      characterCoolDown: character.characterCoolDown + (item.itemStat.cd || 0),
      characterSpeed: character.characterSpeed + (item.itemStat.speed || 0),
    },
  });
}
/** 아이템 장착 해제하기 함수 */
export async function unEquipItem(tx, character, item) {
  // 캐릭터 아이템 테이블에서 레코드 제거
  await tx.characterItems.delete({
    where: { itemId: item.itemId },
  });
  // 아이템의 스탯을 캐릭터로부터 제거
  await tx.characters.update({
    where: { characterId: character.characterId },
    data: {
      characterHp: character.characterHp - (item.itemStat.hp || 0),
      characterPower: character.characterPower - (item.itemStat.power || 0),
      characterCoolDown: character.characterCoolDown - (item.itemStat.cd || 0),
      characterSpeed: character.characterSpeed - (item.itemStat.speed || 0),
    },
  });
}

/**========================================== */
/** 캐릭터 상세 조회 API */
router.get('/characters/:characterId', async (req, res, next) => {
  try {
    const { characterId } = req.params;
    // authMiddleware를 안 거치고 계정 정보에 접근해야 한다. -> authorization헤더에서 접근하기
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
    if ((user && character.accountId === user.accountId) || user.isAdmin) {
      data = { ...data, characterMoney: character.characterMoney };
    }

    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
});

/**====================================== */
/** 토큰으로부터 계정 정보를 얻어오는 함수 */
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

      // 계정 인증 여부 다시 확인
      // (authMiddleware에서 authorization 헤더를 통해 토큰을 검증하곤 있지만 혹시 모르니까...!)
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
      // isAdmin의 값이 true면 일치하지 않아도 삭제할 수 있다.
      if (character.accountId !== user.accountId && !user.isAdmin) {
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
            itemId: true,
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

    return res.status(200).json(characterItem);
  } catch (err) {
    next(err);
  }
});

/**========================================= */
/** 캐릭터 인벤토리 조회 */
router.get(
  '/charactersInventory/:characterId',
  authMiddleware,
  async (req, res, next) => {
    const { characterId } = req.params;
    const { userId } = req.locals;

    try {
      const user = await prisma.accounts.findUnique({
        where: { userId },
      });
      const character = await prisma.characters.findUnique({
        where: { characterId: +characterId },
      });

      // 유효성 검사
      if (!user) {
        return res
          .status(404)
          .json({ message: '로그인 계정이 존재하지 않습니다.' });
      }
      if (user.accountId !== character.accountId && !user.isAdmin) {
        // 운영자 계정으론 볼 수 있다.
        return res.status(403).json({
          message: '다른 계정이 소유한 캐릭터의 인벤토리는 조회할 수 없습니다.',
        });
      }

      const characterInventoryItem = await prisma.characterInventory.findMany({
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
      if (!characterInventoryItem) {
        return res
          .status(404)
          .json({ message: '인벤토리가 존재하지 않는 캐릭터입니다.' });
      }

      return res.status(200).json(characterInventoryItem);
    } catch (err) {
      next(err);
    }
  },
);

/**========================================= */
/** 아이템 장착 API */
router.patch(
  '/characters/equip/:characterId',
  authMiddleware,
  async (req, res, next) => {
    const { characterId } = req.params;
    const { userId } = req.locals;
    const { itemCode } = req.body;

    try {
      // 필수 입력값을 모두 받았는지 확인
      if (!itemCode) {
        return res.status(400).json({ error: '아이템 코드를 입력해 주세요.' });
      }

      const { updatedCharacter } = await prisma.$transaction(
        async (tx) => {
          const user = await prisma.accounts.findUnique({
            where: { userId },
          });
          const character = await prisma.characters.findUnique({
            where: { characterId: +characterId },
          });
          // 계정이 소유한 캐릭터가 맞는지 확인
          if (user.accountId !== character.accountId && !user.isAdmin) {
            return res.status(403).json({
              message: '다른 계정이 소유한 캐릭터입니다.',
            });
          }

          // 조건에 맞는 아이템 조회
          const item = await prisma.items.findFirst({
            where: {
              itemCode: +itemCode,
              characterId: +characterId,
              classId: character.classId,
            },
          });
          if (!item) {
            return res.status(400).json({
              message:
                '소유하지 않았거나, 현재 캐릭터가 장착할 수 없는 아이템입니다.',
            });
          }

          // 캐릭터가 이미 장착한 아이템은 아닌지 확인
          const isEquippedItem = await prisma.characterItems.findFirst({
            where: {
              itemId: item.itemId,
              characterId: character.characterId,
            },
          });
          if (isEquippedItem) {
            return res.status(400).json('이미 착용 중인 아이템입니다.');
          }

          // 아이템 장착
          await equipItem(tx, character, item);

          // 인벤토리에서 삭제
          await tx.characterInventory.delete({
            where: { itemId: item.itemId },
          });

          // 업데이트된 DB를 반영하여 캐릭터를 불러온다.
          const updatedCharacter = await tx.characters.findUnique({
            where: { characterId: character.characterId },
          });

          return { updatedCharacter };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );

      return res.status(201).json({
        message: '캐릭터 생성 및 기본 아이템 장착이 완료되었습니다.',
        character: {
          name: updatedCharacter.characterName,
          hp: updatedCharacter.characterHp,
          power: updatedCharacter.characterPower,
          speed: updatedCharacter.characterSpeed,
          cooldown: updatedCharacter.characterCoolDown,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** 아이템 장착 해제 API */
router.patch(
  '/characters/unEquip/:characterId',
  authMiddleware,
  async (req, res, next) => {
    const { characterId } = req.params;
    const { userId } = req.locals;
    const { itemId } = req.body;

    try {
      // 필수 입력값을 모두 받았는지 확인
      if (!itemId) {
        return res.status(400).json({ error: '아이템 ID를 입력해 주세요.' });
      }

      const { updatedCharacter } = await prisma.$transaction(
        async (tx) => {
          const user = await prisma.accounts.findUnique({
            where: { userId },
          });
          const character = await prisma.characters.findUnique({
            where: { characterId: +characterId },
          });
          // 계정이 소유한 캐릭터가 맞는지 확인
          if (user.accountId !== character.accountId && !user.isAdmin) {
            return res.status(403).json({
              message: '다른 계정이 소유한 캐릭터입니다.',
            });
          }

          // 조건에 맞는 아이템을 조회
          const item = await prisma.items.findFirst({
            where: {
              itemId: +itemId,
              characterId: +characterId,
            },
          });
          if (!item) {
            return res.status(404).json({
              message: '장착되지 않은 아이템입니다.',
            });
          }

          // 아이템 장착 해제
          await unEquipItem(tx, character, item);

          // 인벤토리에 아이템 추가
          await tx.characterInventory.create({
            data: { characterId: character.characterId, itemId: +itemId },
          });

          // 업데이트된 DB를 반영하여 캐릭터를 불러온다.
          const updatedCharacter = await tx.characters.findUnique({
            where: { characterId: character.characterId },
          });

          return { updatedCharacter };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );

      return res.status(201).json({
        message: '장착한 아이템이 해제되었습니다.',
        character: {
          name: updatedCharacter.characterName,
          hp: updatedCharacter.characterHp,
          power: updatedCharacter.characterPower,
          speed: updatedCharacter.characterSpeed,
          cooldown: updatedCharacter.characterCoolDown,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;

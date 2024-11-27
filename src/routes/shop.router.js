import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/** 아이템 구입 API */
// itemCode와 count를 통해 구매할 수 있다.
// (경매장이 아니라 상인NPC에게 구매한다고 가정하여 코드를 작성했습니다.)
// 아이템 코드에 대응하는 아이템을 조회(같은 코드를 가진 아이템은 스탯이 동일하므로)
// 가격*수량만큼 캐릭터의 골드 차감, 돈이 모자라면 400 return
// 서버에 새로운 아이템이 생성
// 생성한 itmeId를 바탕으로 characterInventory에 레코드가 추가됨
router.patch(
  '/shop/purchase/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { characterId } = req.params;
      const { itemCode, count } = req.body;
      const { userId } = req.locals;
      const user = await prisma.accounts.findUnique({
        where: { userId },
      });

      // 계정이 소유한 캐릭터가 맞는지 검사
      const character = await prisma.characters.findUnique({
        where: { characterId: +characterId, accountId: user.accountId },
      });
      if (!character) {
        return res
          .status(404)
          .json({ message: '계정이 소유하고 있는 캐릭터가 아닙니다.' });
      }

      // 아이템 유효성 검사
      const item = await prisma.items.findFirst({
        where: { itemCode: +itemCode },
      });
      if (!item) {
        return res.status(400).json({ error: '존재하지 않는 아이템입니다.' });
      }

      // 비용확인
      const totalCost = item.itemPrice * count;
      if (totalCost > character.characterMoney) {
        return res.status(400).json({ message: '금액이 부족합니다.' });
      }

      await prisma.$transaction(
        async (tx) => {
          // 골드 변화
          let totalPrice = -item.itemPrice * count;
          await IncomeOutcome(character, totalPrice);

          const purchasedItems = [];
          for (let i = 0; i < count; i++) {
            const purchasedItem = await tx.items.create({
              data: {
                itemCode: item.itemCode,
                itemName: item.itemName,
                itemStat: item.itemStat,
                itemPrice: item.itemPrice,
                classId: item.classId,
              },
            });

            // 인벤토리에 아이템 추가
            await tx.characterInventory.create({
              data: {
                characterId: character.characterId,
                itemId: purchasedItem.itemId,
              },
            });

            purchasedItems.push(purchasedItem);
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );

      // 보유 골드 업데이트를 위해 캐릭터 보유 골드 다시 불러오기
      const updatedCharacter = await prisma.characters.findUnique({
        where: {
          characterId: character.characterId,
          accountId: user.accountId,
        },
        select: {
          characterMoney: true,
        },
      });

      return res.status(201).json({
        message: `${item.itemName}을(를) ${count}개 구매하였습니다. 현재 보유 금액은 ${updatedCharacter.characterMoney}골드입니다.`,
      });
    } catch (err) {
      return err;
    }
  },
);

//==============================/
/** 아이템 구매 혹은 판매 시 골드 변화 함수 */
export async function IncomeOutcome(character, totalPrice) {
  await prisma.characters.update({
    where: { characterId: character.characterId },
    data: {
      characterMoney: character.characterMoney + totalPrice,
    },
  });
}

//==============================/
/** 아이템 판매 API */
router.delete(
  '/shop/sell/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { characterId } = req.params;
      const { itemCode, count } = req.body;

      const { userId } = req.locals;
      const user = await prisma.accounts.findUnique({
        where: { userId },
      });

      // 계정이 소유한 캐릭터가 맞는지 검사
      const character = await prisma.characters.findUnique({
        where: { characterId: +characterId, accountId: user.accountId },
      });
      if (!character) {
        return res
          .status(404)
          .json({ message: '계정이 소유하고 있는 캐릭터가 아닙니다.' });
      }

      // 아이템 유효성 검사
      const sellItems = await prisma.items.findFirst({
        where: { itemCode: +itemCode, },
      });
      const sellItems = await prisma.characterInventory.findMany({
        where: { itemCode: +itemCode },
        take: count,
      });
      if (!sellItems || sellItems.length === 0) {
        return res
          .status(400)
          .json({ message: '인벤토리에서 조회할 수 없는 아이템입니다.' });
      }

      // 수량이 부족하지 않은가?
      if (sellItems.length < count) {
        return res
          .status(400)
          .json({ message: '보유한 아이템의 수량이 부족합니다.' });
      }

      // 아이템 판매
      await prisma.$transaction(
        async (tx) => {
          // 골드 획득(60%)
          let totalPrice = sellItems[0].itemPrice * 0.6 * count;
          await IncomeOutcome(character, totalPrice);

          // 캐릭터 인벤토리에서 sellitems배열에 담겨있던 아이템들을 items 테이블에서 삭제(onDelete: Cascade옵션을 통해 캐릭터 인벤에서도 삭제가 된다.)
          for (let i = 0; i < count; i++) {
            await tx.items.delete({
              where: {
                itemId: sellItems[i].itemId,
              },
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );

      // 보유 골드 업데이트를 위해 캐릭터 보유 골드 다시 불러오기
      const updatedCharacter = await prisma.characters.findUnique({
        where: {
          characterId: character.characterId,
          accountId: user.accountId,
        },
        select: {
          characterMoney: true,
        },
      });

      return res.status(201).json({
        message: `${sellItems[0].itemName}을(를) ${count}개 판매하였습니다. 현재 보유 금액은 ${updatedCharacter.characterMoney}골드입니다.`,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;

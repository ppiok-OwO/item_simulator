import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

export default async function (req, res, next) {
  try {
    // 1. Authorization 헤더를 가져옴
    const authorization = req.headers.authorization;
    if (!authorization) {
      throw new Error('Authorization 헤더가 없습니다.');
    }

    // 2. Bearer 토큰 형식인지 확인
    const [tokenType, token] = authorization.split(' ');
    if (tokenType !== 'Bearer') {
      throw new Error('토큰 타입이 Bearer 형식이 아닙니다.');
    }

    // 3. JWT 검증
    const decodedToken = jwt.verify(token, 'custom-secret-key');
    const userId = decodedToken.userId;

    // 4. 사용자 조회
    const user = await prisma.users.findFirst({
      where: { userId: +userId },
    });
    if (!user) {
      throw new Error('토큰에 해당하는 사용자가 없습니다.');
    }

    // 5. 사용자 정보를 req.user에 저장
    req.user = user;

    // 6. 다음 미들웨어 실행
    next();
  } catch (error) {
    // 에러 처리
    switch (error.name) {
      case 'TokenExpiredError':
        return res.status(401).json({ message: '토큰이 만료되었습니다.' });
      case 'JsonWebTokenError':
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
      default:
        return res
          .status(401)
          .json({ message: error.message || '비정상적인 요청입니다.' });
    }
  }
}

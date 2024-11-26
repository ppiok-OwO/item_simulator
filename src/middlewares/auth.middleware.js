import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { prisma } from '../utils/prisma/index.js';

dotenv.config();

export default async function (req, res, next) {
  try {
    // 1. Authorization 헤더를 가져옴
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.trim()) {
      // authorization헤더가 비어있거나 빈칸만 존재할 경우
      return res
        .status(401)
        .json({ message: 'Authorization 헤더가 없습니다.' });
    }

    // 2. Bearer 토큰 형식인지 확인
    const [tokenType, token] = authorization.split(' ');
    if (tokenType !== 'Bearer' || !token) {
      return res
        .status(400)
        .json({
          message: '토큰 타입이 Bearer 형식이 아니거나 누락되었습니다.',
        });
    }

    // 3. JWT 검증
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: '토큰이 만료되었습니다.' });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
      } else {
        return res.status(401).json({ message: '비정상적인 요청입니다.' });
      }
    }

    const userId = decodedToken.userId;
    if (!userId) {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }

    // 4. 계정 조회
    const user = await prisma.accounts.findFirst({
      where: { userId: userId },
    });
    if (!user) {
      return res
        .status(401)
        .json({ message: '토큰에 해당하는 계정이 존재하지 않습니다.' });
    }

    // 5. 인증 성공 시 사용자 정보 저장
    req.locals = req.locals || {};
    req.locals.user = user;
    req.locals.userId = userId;

    // 6. 다음 미들웨어 실행
    next();
  } catch (err) {
    next(err);
  }
}

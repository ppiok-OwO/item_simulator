import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

/** 회원가입 API */
// 아이디, 비밀번호, 비밀번호 확인, 이름을 데이터로 넘겨서 회원가입을 요청합니다.
// - 보안을 위해 비밀번호는 평문(Plain Text)으로 저장하지 않고 해싱된 값을 저장합니다.
// - 아래 사항에 대한 **유효성 체크**를 해야 되며 유효하지 않은 경우 알맞은 HTTP 상태코드와 에러 메세지를 반환해야 합니다.
// - **아이디**: 다른 사용자와 중복될 수 없으며 오로지 **영어 소문자 + 숫자 조합**으로 구성이 되어야 합니다.
// - **비밀번호:** 최소 6자 이상이며, 비밀번호 확인과 일치해야 합니다.
// - 회원가입 성공 시, 비밀번호를 제외 한 사용자의 정보를 반환합니다.
router.post('/sign-up', async (req, res, next) => {
  const { userId, password, passwordCheck, userName } = req.body;

  try {
    // 회원가입에 필요한 정보들을 모두 입력했는지 확인
    if (!userId || !password || !passwordCheck || !userName) {
      return res
        .status(400)
        .json({ error: '사용자 정보를 모두 입력해 주세요.' });
    }

    // ID 유효성 검사
    const isValidUserId = /^[a-z0-9]+$/.test(userId);
    if (!isValidUserId) {
      return res.status(400).json({
        error:
          '사용자 ID는 공백 없이 영어 소문자와 숫자의 조합으로만 구성되어야 합니다.',
      });
    }
    // 중복되는 사용자 ID가 존재하는지 검사
    const isExitUserId = await prisma.accounts.findFirst({
      where: { userId },
    });
    if (isExitUserId) {
      return res.status(400).json({ message: '이미 존재하는 ID입니다.' });
    }

    // password 유효성 검사 + 비밀번호 확인이 일치하는지 검사
    // 비밀번호는 길이 빼고는 따로 기준이 없어서 ID와 같은 방식으로 유효성 검사를 해주었다.
    const isValidPassword = /^[a-z0-9]+$/.test(password);
    if (!isValidPassword) {
      return res.status(400).json({
        error:
          '사용자 비밀번호는 공백 없이 영어 소문자와 숫자의 조합으로만 구성되어야 합니다.',
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: '사용자 비밀번호는 최소 6자리 이상이어야 합니다.',
      });
    }
    if (password !== passwordCheck) {
      return res.status(400).json({
        error: '비밀번호 확인이 일치하지 않습니다.',
      });
    }

    // 사용자 이름 유효성 검사
    // 한국어여야 하고 비어있으면 안 된다.
    const isValidUserName = /^[가-힣]+$/;
    if (!isValidUserName) {
      return res.status(400).json({
        error: '올바르지 않은 이름입니다.',
      });
    }

    // 비밀번호를 해싱된 값으로 저장한다.
    const hashedPassword = await bcrypt.hash(password, 10);

    // DB에 회원가입 정보를 생성
    await prisma.accounts.create({
      data: {
        userId,
        password: hashedPassword,
        userName,
      },
    });

    return res.status(201).json({
      message: '계정이 성공적으로 생성되었습니다.',
      data: { userId, userName },
    });
  } catch (err) {
    next(err);
  }
});

/** 로그인 API */
// 아이디, 비밀번호로 로그인을 요청합니다.
// - 계정 정보가 일치하지 않을 경우 알맞은 HTTP 상태코드와 에러 메세지를 반환해야 합니다.
// - 아이디가 존재하지 않는 경우
// - 아이디는 존재하는데 비밀번호가 틀리는 경우
// **로그인 성공 시, 엑세스 토큰을 생성하여 반환합니다.**
// - 이 때, 엑세스 토큰의 Payload는 로그인 한 계정의 ID를 담고 있어야겠죠?
router.post('/sign-in', async (req, res, next) => {
  const { userId, password } = req.body;

  try {
    // 값이 모두 입력되었는지 검사()
    if (!userId || !password) {
      return res
        .status(400)
        .json({ error: '로그인 정보를 모두 입력해 주세요.' });
    }

    // 일치하는 ID와 비밀번호가 존재하는지 검사
    // 아이디가 존재하지 않는 경우
    // 비밀번호가 틀린 경우
    const user = await prisma.accounts.findFirst({
      where: { userId },
    });
    if (!user) {
      res.status(401).json({ message: '존재하지 않는 ID입니다.' });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: '잘못된 비밀번호입니다.' });
    }

    // 로그인에 성공하면, 사용자의 userId를 바탕으로 토큰을 생성한다.
    // jwt.sign()을 이용해서 액세스 토큰과 리프레쉬 토큰 할당
    const accessToken = jwt.sign(
      { userId: user.userId },
      process.env.TOKEN_SECRET_KEY,
      {
        expiresIn: '7d',
      },
    );

    // authorization헤더에 Bearer 토큰을 담아서 유저에게 응답합니다.
    res.setHeader('authorization', `Bearer ${accessToken}`);

    return res
      .status(200)
      .json({ message: '로그인 성공. Token이 정상적으로 발급되었습니다.' });
  } catch (err) {
    next(err);
  }
});

export default router;

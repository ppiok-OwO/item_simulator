export default (err, req, res, next) => {
  console.log('에러 처리 미들웨어가 실행되었습니다.');
  console.error(err);
  // 에러 처리
  switch (err.name) {
    case 'TokenExpiredError':
      return res
        .status(401)
        .json({ errorMessage: '토큰이 만료되었습니다. 재로그인이 필요합니다.' });
    case 'JsonWebTokenError':
      return res.status(401).json({ errorMessage: '유효하지 않은 토큰입니다.' });
    default:
      return res
        .status(401)
        .json({ errorMessage: '비정상적인 요청입니다.' });
  }
};

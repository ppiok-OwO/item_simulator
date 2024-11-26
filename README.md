# 『 프로젝트 - 아이템 시뮬레이터 』
## 프로젝트 소개
백엔드 개발자로 한걸음 내딛기 위한 미니 프로젝트!</br>
Node.js의 express 모듈을 활용하여 아이템 시뮬레이터를 만들어 봅시다. 이 프로젝트에서 필수로 구현해야 하는 기능은 아래와 같습니다.
- 계정 생성(회원가입)
- 로그인
- 캐릭터 생성
- 캐릭터 삭제
- 캐릭터 상세 조회
- 아이템 생성
- 아이템 수정
- 아이템 목록 조회
- 아이템 상세 조회
## 프로젝트 컨셉
캐릭터 생성 시, 반드시 클래스(직업)를 선택하게끔 API를 구현했습니다. 각 클래스마다 서로 다른 스탯을 가지고 있습니다.
```JSON
"class1": {
    "className": "전사",
    "classHp": 1000,
    "classPower": 100,
    "classSpeed": 10,
    "classCoolDown": 5
  },
  "class2": {
    "className": "도적",
    "classHp": 700,
    "classPower": 110,
    "classSpeed": 12,
    "classCoolDown": 10
  },
  "class3": {
    "className": "마법사",
    "classHp": 800,
    "classPower": 120,
    "classSpeed": 8,
    "classCoolDown": 15
  },
  "class4": {
    "className": "사제",
    "classHp": 900,
    "classPower": 90,
    "classSpeed": 9,
    "classCoolDown": 9
  }
```
처음 생성된 캐릭터는 각 클래스의 기본 아이템을 착용하게 됩니다.
```JSON
"item1": {
    "itemCode": 1,
    "itemName": "강철심장",
    "itemStat": { "hp": 900, "power": 12 },
    "itemPrice": 3000,
    "classId": 1
  },
  "item2": {
    "itemCode": 2,
    "itemName": "밤의 끝자락",
    "itemStat": { "hp": 250, "power": 65 },
    "itemPrice": 3000,
    "classId": 2
  },
  "item3": {
    "itemCode": 3,
    "itemName": "라바돈의 죽음 모자",
    "itemStat": { "power": 120 },
    "itemPrice": 3600,
    "classId": 3
  },
  "item4": {
    "itemCode": 4,
    "itemName": "불타는 향로",
    "itemStat": { "hp": 100, "power": 45, "speed": 4 },
    "itemPrice": 2200,
    "classId": 4
  }
```
즉, `초기 캐릭터의 스탯`은 `클래스 기본 스탯` + `기본 장착 아이템 스탯`을 더한 값을 가지게 됩니다.</br></br>
(예시 이미지)
![img_title](src/images/image3.png)
# 개발 체크리스트
## 프로젝트 관리
- [x] `.env` 파일을 이용해서 민감한 정보(DB 계정 정보, API Key 등)를 관리 ✅ 2024-11-25
- [x] `.gitignore` 파일을 생성하여 `.env` 파일과 `node_modules` 폴더가 Github에 올라가지 않도록 설정 ✅ 2024-11-25
- [x] `.prettierrc` 파일을 생성 ✅ 2024-11-25

## AWS EC2 배포
- [ ] EC2 인스턴스 생성
- [ ] 도메인 연결

## 인증 미들웨어 구현
- [x] Request의 Authorization 헤더에서 JWT를 가져와서 사용자 인증 검사 ✅ 2024-11-26
- [x] Authorization에 담겨 있는 값의 형식이 표준(Bearer  JWT Value)과 일치하지 않는 경우 인증 실패! ✅ 2024-11-26
- [x] JWT의 유효기한이 지난 경우 인증 실패! ✅ 2024-11-26
- [x] JWT 검증(JWT Secret 불일치, 데이터 조작으로 인한 Signature 불일치 등)에 실패한 경우 인증 실패! ✅ 2024-11-26
- [x] 인증에 성공하는 경우에는 req.locals.user에 인증된 사용자 정보를 담고서 남은 미들웨어를 진행한다. ✅ 2024-11-26

## 데이터베이스 모델링
Accounts : 사용자 계정 테이블
Characters : 계정이 생성한 캐릭터 테이블
Items : 아이템 테이블
Classes : 캐릭터 클래스(직업) 테이블
BasicItems : 클래스별 기본 아이템 테이블(아이템 테이블 참조)
CharactersItems : 캐릭터가 장착하고 있는 아이템 테이블(아이템 테이블 참조)
CharactersInventory : 캐릭터가 보유하고 있는 아이템 테이블(아이템 테이블 참조)
- 초기 모델링
![img_title](src/images/image1.png)
- 업데이트된 모델링
![img_title](src/images/image2.png)
## API 구현하기
### 계정 생성(회원 가입) API
- [x] req.body로부터 id, 비밀번호, 비밀번호 확인, 이름을 넘겨 받는다. ✅ 2024-11-25
- [x] 비밀번호는 해싱해서 저장한다. ✅ 2024-11-25
- [x] ID : 영어 소문자+숫자 조합(중복 불가) ✅ 2024-11-25
- [x] 비밀 번호 : 최소 6자 이상(특별한 기준이 없어서 ID와 같은 기준을 적용했다.) ✅ 2024-11-25
- [x] ID와 비밀번호에 대해 유효성 검사를 한다. ✅ 2024-11-25
- [x] 예외 발생 시, HTTP 상태코드와 에러 메세지를 반환한다. ✅ 2024-11-25
### 로그인 API
- [x] req.body로부터 id, 비밀번호를 넘겨 받는다. ✅ 2024-11-26
- [x] 아이디가 존재하는지 검사 ✅ 2024-11-26
- [x] 아이디에 대응하는 비밀번호인지 검사 ✅ 2024-11-26
- [x] 예외 발생 시, HTTP 상태코드와 에러 메세지를 반환한다. ✅ 2024-11-26
- [x] 로그인에 성공하면 accessToken을 생성하여 반환한다. ✅ 2024-11-26
### 클래스 생성 API
- [x] 클래스 이름, 클래스 체력, 클래스 전투력, 클래스 스피드, 클래스 쿨다운을 request로 전달받기 ✅ 2024-11-26
- [x] 운영자 권한 검사 ✅ 2024-11-26
- [x] 데이터 유효성 검사 ✅ 2024-11-26
- [x] 캐릭터 이름이 중복되는지 검사 ✅ 2024-11-26
- [x] 예외 발생 시, HTTP 상태코드와 에러 메세지를 반환 ✅ 2024-11-26
- [x] 새로운 클래스 데이터를 생성 ✅ 2024-11-26
- [x] 메시지와 함께 생성한 클래스 데이터 반환 ✅ 2024-11-26
### 아이템 생성 API
- [x] 아이템 코드, 이름, 스탯, 가격을 request로 전달받기 ✅ 2024-11-26
- [x] 데이터 유효성 검사 ✅ 2024-11-26
- [x] 새로운 아이템 데이터 생성 ✅ 2024-11-26
- [x] 예외 발생 시, HTTP 상태코드와 에러 메세지를 반환 ✅ 2024-11-26
- [x] 메시지와 함께 생성한 아이템 데이터(json) 반환 ✅ 2024-11-26
### 아이템 수정 API
- [x] 아이템 코드는 URI의 parameter로 전달 ✅ 2024-11-26
- [x] 아이템 명, 아이템 능력을 request로 전달 ✅ 2024-11-26
- [x] 운영자 권한 검사, 유효성 검사 ✅ 2024-11-26
- [x] 수정된 아이템 데이터를 json 형식으로 반환 ✅ 2024-11-26
- [x] 예외 발생 시, HTTP 상태코드와 에러 메세지를 반환한다. ✅ 2024-11-26
### 아이템 목록 조회 API
- [x] 아이템 코드, 아이템 명, 아이템 가격 조회 ✅ 2024-11-26
- [x] 아이템 목록을 json 형식으로 반환 ✅ 2024-11-26
- [x] 예외 발생 시, HTTP 상태코드와 에러 메세지를 반환한다. ✅ 2024-11-26
### 아이템 상세 조회 API
- [x] 아이템 코드를 URI의 parameter로 전달 받아 아이템 코드, 아이템 명, 아이템 능력, 아이템 가격을 조회 ✅ 2024-11-26
- [x] 상세 조회한 아이템 데이터를 json 형식으로 반환 ✅ 2024-11-26
- [x] 예외 발생 시, HTTP 상태코드와 에러 메세지를 반환한다. ✅ 2024-11-26
### 클래스별 기본 아이템 생성 API
- [x] 아이템 id, 클래스 id를 request로 전달받기 ✅ 2024-11-26
- [x] 데이터 유효성 검사 ✅ 2024-11-26
- [x] 운영자 권한 검사 ✅ 2024-11-26
- [x] 새로운 기본 아이템 생성 ✅ 2024-11-26
- [x] 예외 발생 시, HTTP 상태코드와 에러 메세지를 반환한다. ✅ 2024-11-26
- [x] 메시지와 함께 생성한 기본 아이템 데이터 반환 ✅ 2024-11-26
### 캐릭터 생성 API(JWT 인증)
- [x] req.body로부터 캐릭터 이름, 클래스Id를 넘겨 받는다. ✅ 2024-11-26
- [x] authMiddleware를 통해 jwt 인증을 거치고 사용자 데이터를 받는다. ✅ 2024-11-26
- [x] 캐릭터 이름 유효성 검사(공백 포함 15글자 이하만 가능, 공백만 입력했을 경우, 입력하지 않은 것으로 처리, 중복 불가) ✅ 2024-11-26
- [x] 클래스 유효성 검사(선택한 클래스가 Class DB에 존재하는가?) ✅ 2024-11-26
- [x] 예외 발생 시, HTTP 상태코드와 에러 메세지를 반환한다. ✅ 2024-11-26
- [x] 선택한 클래스에 따라 캐릭터가 착용할 기본 아이템을 생성하고, 장착한 뒤, 그에 따른 스탯을 부여한다. ✅ 2024-11-26
### 캐릭터 삭제 API(JWT 인증)
- [x] 삭제할 캐릭터의 ID는 URI의 parameter로 전달 ✅ 2024-11-26
- [x] authMiddleware를 통해 jwt 인증을 거치고 사용자 데이터를 받는다 ✅ 2024-11-26
- [x] 유효성 검사 + 계정이 소유한 캐릭터가 맞는지 검사 ✅ 2024-11-26
- [x] 일치한다면 캐릭터 삭제 ✅ 2024-11-26
- [x] 예외 발생 시, HTTP 상태코드와 에러 메세지를 반환한다. ✅ 2024-11-26
### 캐릭터 상세 조회 API
- [x] 캐릭터의 ID를 URI의 parameter로 전달 ✅ 2024-11-26
- [x] 유효성 검사 ✅ 2024-11-26
- [x] 캐릭터 이름과 여러 스탯을 전달 ✅ 2024-11-26
- [x] 플레이어가 유효한 token을 가지고 있고 , 본인의 캐릭터를 조회한다면 게임 머니까지 조회 ✅ 2024-11-26
- [x] 예외 발생 시, HTTP 상태코드와 에러 메세지를 반환한다. ✅ 2024-11-26
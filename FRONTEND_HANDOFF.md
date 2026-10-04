# 프론트엔드 인계

목표: 한국어 패치 다운로드 안내와 한국어 매뉴얼 7종을 제공하는 웹사이트의 디자인을 자유롭게 개선합니다. 현재 구현은 기능을 갖춘 기본 구조입니다.

## 파일 구조

```text
docs/
  index.html                 매뉴얼 목록 및 패치 안내
  manual.html                공용 매뉴얼 뷰어
  assets/css/styles.css      모든 스타일
  assets/js/data.js          JSON 읽기와 DOM 생성 공통 함수
  assets/js/catalog.js       목록, 검색, 체크섬 표시
  assets/js/reader.js        페이지 이동, 확대, 한 쪽씩 보기, 이어 보기, URL 및 키보드 처리
  assets/manuals/{id}/       cover.jpg, 001.jpg부터 시작하는 페이지
  assets/manuals/{id}/thumbs/ 뷰어 페이지 목록용 썸네일 (높이 360px)
  data/catalog.json          매뉴얼 목록
  data/manuals/{id}.json     각 매뉴얼 페이지와 이미지 크기
  data/release.json          메가 컬렉션 릴리스 링크 및 ISO/패치 체크섬
  data/gems-release.json     젬스 컬렉션 ISO/패치 체크섬
release/
  manifest.json              동결 및 패치 검증 기록
  SHA256SUMS.txt              배포 파일 체크섬
  manual-assets.json         매뉴얼 이미지 검증 정보
```

## 데이터 계약

`catalog.json`: `schemaVersion`, `version`, `updatedAt`, `manuals[]`.
매뉴얼 공통 필드: `id`, `title`, `platform`, `sourceEdition`, `pageCount`, `manualPageCount`, `appendixCount`, `cover`, `manifest`.
`collections[]`: 목록 화면의 컬렉션 구역(`mega`, `gems`)과 패치·안내 링크, 검증 정보 파일(`release`). 매뉴얼의 `collection`이 없으면 `mega`입니다.

개별 매뉴얼 JSON의 `downloads[]`는 GitHub 릴리스 `manual-files`의 한국어(`korean`)·원본(`original`)·클린본(`clean`) 무손실 PNG zip입니다. 한국어 zip은 한국어 PDF를 원본 해상도로 렌더링했고 부록까지 사이트와 같은 장수입니다. 원본·클린본 zip에는 부록이 없습니다.

개별 매뉴얼 JSON에는 공통 필드와 `pages[]`가 있습니다. 페이지는 `number` (1부터 시작), `title`, `kind` (`manual` 또는 `appendix`), `image`, `thumb`, `width`, `height`를 가집니다. `thumb`이 없으면 뷰어는 `image`를 썸네일로 씁니다. 경로는 **docs 루트 기준** 상대 경로입니다. 페이지 순서는 JSON 배열 순서입니다. 실제 원본의 인쇄 쪽수와 웹 뷰어의 페이지 번호는 다를 수 있습니다.

링크 규칙: `manual.html?book=sonic1&page=1`. 유효한 book ID는 `sonic1`, `sonic2`, `sonic3`, `sonic-and-knuckles`, `sonic-spinball`, `sonic-3d-blast`, `mean-bean-machine`입니다. 페이지를 이동하면 URL이 갱신되고 브라우저 뒤로 가기로 이전 페이지에 돌아갈 수 있습니다.

## 수정 시 유지할 사항

- 기존 매뉴얼 ID, 직접 링크, 릴리스 링크, 이미지 순서와 본문/부록 구분을 유지합니다.
- 번역 이미지와 릴리스 체크섬은 디자인 작업 중 변경하지 않습니다. 매뉴얼 표지와 본문은 기존 고해상도 JPEG를 사용합니다.
- `/assets/...` 같은 도메인 루트 절대 경로 대신 상대 경로를 사용합니다. 사이트는 `/sonic-mega-collection-plus-ps2-korean/` 하위에 배포됩니다.
- 매뉴얼 7종·웹 139페이지·게임 내부 138개 이미지라는 범위를 구분합니다. 전체 17종 매뉴얼이 한국어화되었다고 표시하지 않습니다.
- 일본어판 기반 5종과 해외 메가 드라이브 영어판 기반 2종의 출처 구분을 유지합니다.
- 반응형 화면, 키보드 이동, 폼 레이블, 포커스 표시, 로딩/오류 안내, 이미지 대체 텍스트를 유지합니다.
- HTML의 ID를 변경하면 해당 JavaScript 선택자도 함께 갱신합니다. 현재 CSS와 JavaScript는 프레임워크 없이 동작하며 자유롭게 교체할 수 있습니다.
- ISO나 게임 ROM을 커밋하지 않습니다. 패치는 GitHub Release 첨부 파일로만 배포합니다.

## 뷰어 기능

페이지 목록(썸네일), 좌우 넘김 버튼, 페이지 번호 입력·슬라이더·목록 선택, 화면 맞춤/폭 맞춤, 확대(최대 400%)와 끌어서 이동, 더블클릭 확대, 전체 화면, 모바일 스와이프, 앞뒤 페이지 미리 불러오기를 지원합니다. 펼친 면을 왼쪽·오른쪽 한 쪽씩 크게 보기(휴대폰 기본), 지난번 보던 페이지로 이어 보기를 지원합니다. 키보드: `←` `→` `Space` `Home` `End` `+` `-` `0` `W` `S` `T` `D` `F` `?`.

디자인 토큰과 Noto Sans KR 글꼴(Google Fonts, SIL OFL)은 노는사람 한국어화 아카이브(`nonunsaram.github.io`)와 같습니다.

## 로컬 실행 및 확인

저장소 루트에서 다음을 실행한 뒤 `http://localhost:8000/`를 엽니다.

```text
python -m http.server 8000 --directory docs
```

JSON을 불러오므로 HTML을 파일 탐색기에서 직접 열지 말고 HTTP 서버를 사용합니다.

확인 항목: 7개 카드, 검색/결과 없음, 각 매뉴얼의 첫/마지막 페이지, 부록 표기, 이전/다음과 방향키, 페이지 선택, 확대, 원본 이미지 링크, 직접 링크 새로고침, 브라우저 뒤로 가기, 잘못된 book ID와 범위 밖 page, 좁은 화면에서 탐색 컨트롤.

## 배포

GitHub Pages 설정: `main` 브랜치, `/docs` 폴더. 별도 npm 설치나 빌드 단계는 없습니다. `docs/.nojekyll`을 유지합니다. 디자인 수정은 `docs/`만으로 가능하며, 동결된 게임 패치 v1.0.0과 독립적으로 진행할 수 있습니다.

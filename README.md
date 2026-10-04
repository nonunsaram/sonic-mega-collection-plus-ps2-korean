# 소닉 메가 컬렉션 플러스 PS2 한국어 패치

일본판 **Sonic Mega Collection Plus (PlayStation 2)**용 비공식 한국어 패치입니다. 사용자 확인을 마친 UI v2.5를 **v1.0.0 최종본**으로 동결했습니다.

- [패치 다운로드](https://github.com/nonunsaram/sonic-mega-collection-plus-ps2-korean/releases/tag/v1.0.0)
- [한국어 매뉴얼 웹 뷰어](https://nonunsaram.github.io/sonic-mega-collection-plus-ps2-korean/)
- [프론트엔드 인계 문서](FRONTEND_HANDOFF.md)

## 적용 범위

메뉴 텍스트 861개 항목과 UI 이미지 라벨 83개를 한국어화했습니다. 매뉴얼은 전체 17종 중 아래 7종을 한국어화했으며, 게임 내부에는 138개 이미지가 적용됩니다. 웹에서는 고해상도 매뉴얼과 부록을 합쳐 139페이지를 열람할 수 있습니다. 표지 구성과 부록 때문에 두 수치는 다릅니다.

| 매뉴얼 | 번역 기준 | 웹 페이지 |
| --- | --- | ---: |
| 소닉 더 헤지혹 | 일본어판 | 24 |
| 소닉 더 헤지혹 2 | 일본어판 | 28 |
| 소닉 더 헤지혹 3 | 일본어판 | 25 |
| 소닉 & 너클즈 | 일본어판 | 27 |
| 소닉 스핀볼 | 일본어판 | 12 |
| 소닉 3D 블래스트 | 해외 메가 드라이브 영어판 | 11 |
| 민 빈 머신 | 해외 메가 드라이브 영어판 | 12 |

수록 게임 ROM은 변경하지 않았습니다. 나머지 10종 매뉴얼은 이번 한국어화 범위에 포함되지 않습니다. UI 실행 화면은 사용자 확인을 거쳤으며, 모든 게임과 모든 화면에 대한 완전한 회귀 검증을 의미하지는 않습니다.

## 패치 적용

1. 직접 보유한 일본판 원본 ISO를 준비합니다. 아래 크기와 SHA-256이 일치하는지 확인합니다.
2. 릴리스에서 `.xdelta` 파일을 다운로드합니다. ISO는 배포하지 않습니다.
3. xdelta3로 원본 ISO에 패치를 적용합니다. 생성과 재적용 검증에는 xdelta3 3.2.1을 사용했습니다.

```text
xdelta3 -d -s "Sonic Mega Collection Plus (Japan).iso" "sonic-mega-collection-plus-ps2-korean-v1.0.0.xdelta" "SONIC_MEGA_COLLECTION_PLUS_KOREAN_1.0.0.iso"
```

GUI 패처에서는 원본 ISO를 Source, `.xdelta`를 Patch, 새 ISO 경로를 Output으로 지정합니다. 원본과 출력 파일 경로는 다르게 지정해 주세요.

원본 및 적용 후 ISO 크기: **4,698,767,360바이트**.

| 파일 | SHA-256 |
| --- | --- |
| 원본 ISO | `0e7796a217555c9b02a9517e6474a81ffb1527673cd971abf2f15cd35e6866de` |
| v1.0.0 패치 | `bd3f31af3675d84270dd8f3b76591554b8f67dee572390b887bf25a3aea6e213` |
| 적용 후 ISO | `81371cb4952ca2c58500f7979f14e8d2546f0e012cf5a3958e0fcd600c5df352` |

생성된 패치를 원본에 다시 적용한 뒤, 출력 ISO와 동결본의 SHA-256이 일치함을 확인했습니다. 기계 판독용 정보는 [release/manifest.json](release/manifest.json), 체크섬은 [release/SHA256SUMS.txt](release/SHA256SUMS.txt)에 있습니다.

## 웹 프론트엔드

`docs/`의 HTML, CSS, JavaScript와 JSON으로 구성된 정적 사이트입니다. 별도 빌드나 외부 라이브러리가 필요하지 않습니다. GitHub Pages는 `main` 브랜치의 `/docs`를 게시합니다. 디자인 수정은 `FRONTEND_HANDOFF.md`를 먼저 확인해 주세요.

## 권리 안내

Sonic 및 관련 게임, 로고, 원본 매뉴얼의 권리는 SEGA 및 각 권리자에게 있습니다. 비공식 팬 번역 프로젝트이며 SEGA의 공식 배포물이 아닙니다. 원본 콘텐츠에 대한 별도 재라이선스를 부여하지 않습니다.

# 프로필 목록 관리

프로필 README는 **스타 상위 4개 + 나머지 중 최근 코드 업데이트 1개**를 보여줍니다. 공개된 원본 저장소만 대상으로 하며, 프로필 저장소 자체·포크·보관된 저장소·비활성 저장소는 제외합니다.

- 스타 수가 같으면 저장소 이름순으로 정렬합니다.
- 최근 업데이트는 `pushed_at` 기준입니다. 스타나 설명 변경으로 달라지는 `updated_at`은 사용하지 않습니다.
- 상위 4개와 최근 업데이트 목록은 중복되지 않습니다.
- 새 공개 저장소도 자동으로 대상에 포함됩니다.

## 갱신 주기

GitHub Actions가 6시간마다 README와 `PROJECTS.md`를 갱신합니다. 한국 시간 기준 03:17, 09:17, 15:17, 21:17에 예약되어 있으며 GitHub 상황에 따라 지연될 수 있습니다. 목록 설정을 수정하면 바로 실행되며, Actions → Update profile showcase → Run workflow에서 직접 실행할 수도 있습니다.

별도 API 키나 개인 토큰은 필요하지 않습니다. GitHub가 제공하는 `GITHUB_TOKEN`으로 이 프로필 저장소의 생성된 파일만 커밋합니다. 내용이 바뀌지 않으면 커밋하지 않습니다.

GitHub는 공개 저장소에 60일간 활동이 없으면 예약 워크플로를 비활성화할 수 있습니다. 그 경우 Actions에서 워크플로를 다시 활성화합니다.

## 표시 개수와 제외 목록

`profile.config.json`에서 `top_count`, `recent_count`, `exclude_repositories`를 수정합니다. 설명을 직접 관리하려면 `descriptions`에 저장소 이름과 설명을 넣습니다.

## 웹페이지 추가

`profile.config.json`의 `web_pages` 배열에 아래 형식으로 항목을 추가합니다. 개수 제한 없이 README와 `PROJECTS.md`에 반영됩니다.

```json
{
  "title": "페이지 이름",
  "url": "https://example.com/",
  "description": "페이지 설명"
}
```

## 오픈소스 제작 페이지 추가

공개 원본 저장소의 About → Website에 문서, 데모, 프로젝트 소개 페이지 주소를 등록하면 자동으로 수집합니다. 저장소에 등록하지 않은 별도 페이지는 `open_source_pages` 배열에 위 형식으로 추가합니다.

`PROJECTS.md`는 전체 목록을 모아두는 공간이며 프로필에서도 연결됩니다. 사이트 소스의 라이선스는 각 프로젝트에서 관리합니다.

## 벤치마크 자료 묶음

`benchmark_groups`에서 벤치마크 자료를 묶어 관리합니다. 현재 **추론 설정 비교** 2개와 **복셀 파고다 모델별 결과** 4개가 등록되어 있으며, README와 `PROJECTS.md`의 BENCHMARKS 영역에서 함께 보여줍니다. 새 자료는 해당 그룹의 `pages` 배열에 웹페이지와 같은 형식으로 추가합니다.

일반 웹페이지 6개와 벤치마크 6개를 합쳐 총 12개를 게시합니다. 벤치마크 페이지의 주소가 저장소 Website에도 등록되어 있으면 오픈소스 목록에 중복해서 표시하지 않습니다.

감헤임과 AI 2040은 게시 목록에서 제외했습니다. 두 사이트의 식별명을 `exclude_page_slugs`에 등록해 두었으므로, 이후 웹페이지·벤치마크·오픈소스 목록이나 저장소 Website를 통해 들어와도 표시하지 않습니다.

## GitHub 기본 Pinned 영역

현재 핀 5개도 프로필의 초기 목록과 맞춰 설정했습니다. GitHub 기본 핀은 최대 6개이며 선택·정렬은 수동입니다. 자동으로 바뀌는 4+1 목록은 상단 README에서 제공합니다. 기본 핀의 미래 변경은 Customize your pins에서 관리합니다.

## 로컬 검증

```sh
node --test scripts/update-profile.test.mjs
node scripts/update-profile.mjs
```

README의 `AUTO:BUILDER-INDEX` 주석 사이만 자동 갱신됩니다. 헤더 이미지와 소개 문구는 그대로 관리할 수 있습니다.

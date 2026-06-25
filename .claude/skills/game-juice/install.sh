#!/usr/bin/env bash
# game-juice 런타임 모듈을 프로젝트에 설치한다 (자기완결형 드롭인).
# 사용: bash install.sh [프로젝트_루트]      (기본: 현재 디렉터리)
#   예) bash ~/.claude/skills/game-juice/install.sh .
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJ="${1:-.}"
DEST="$PROJ/src/lib/juice"

if [ ! -d "$PROJ/src" ]; then
  echo "⚠️  '$PROJ/src' 가 없어요. 프로젝트 루트를 인자로 지정하세요: bash install.sh <루트>" >&2
  exit 1
fi

mkdir -p "$DEST"
cp "$SKILL_DIR/module/"*.ts "$DEST/"
echo "✓ 설치 완료: $DEST"
echo "  파일: sfx.ts, effects.ts, floatText.ts, useJuice.ts, index.ts"
echo "  사용: import { useJuice, shake, flash, burstConfetti, vibrate } from '<상대경로>/lib/juice'"
echo "  주의: React 프로젝트가 아니면 useJuice.ts 는 빼고 써도 됩니다(effects/sfx/floatText 는 React 불필요)."

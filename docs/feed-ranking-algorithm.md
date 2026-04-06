# 피드 추천 정렬 알고리즘

## 개요

사진 고연전 플랫폼의 피드 정렬에 사용되는 추천 알고리즘이다.
단순 좋아요 순이나 랜덤이 아닌, 통계적 공정성과 탐색 기회를 동시에 보장하는 방식으로 설계했다.
또한 단시간 비정상적 투표 급등(억지 홍보)을 감지하여 자동으로 점수를 억제하는 메커니즘을 포함한다.

## 목표

- 좋아요가 많은 사진은 상위에 자주 노출
- 좋아요가 적거나 없는 사진도 발견될 기회 보장
- 새로 올라온 사진에 초기 노출 부스트 제공
- 매 세션마다 약간씩 다른 피드 순서로 재방문 유도
- 단시간 투표 급등(어뷰징) 감지 및 억제

## 알고리즘 구성

최종 점수는 4가지 요소의 가중합에 속도 패널티와 랜덤 변동을 곱한 값이다.

```
score = (wilson * 0.4 + time_boost * 0.25 + exploration * 0.35) * velocity_penalty * jitter
```

### 1. Wilson Score Lower Bound (가중치: 40%)

Reddit 초창기에 사용한 것으로 알려진 통계 기반 랭킹 방식이다.
이항분포의 신뢰구간 하한을 이용해, 투표 수가 적어도 통계적으로 공정하게 평가한다.

```
z = 1.96 (95% 신뢰구간)
p = votes / n
lower_bound = (p + z^2/2n - z * sqrt(p(1-p)/n + z^2/4n^2)) / (1 + z^2/n)
```

- n(총 노출 수)은 전체 사진 수로 추정
- 투표 수가 적으면 신뢰구간이 넓어져 하한값이 낮아짐 -> 과대평가 방지
- 투표 수가 많으면 신뢰구간이 좁아져 실제 비율에 수렴 -> 인기 사진 정당한 평가

특징:
- 좋아요 1개인 사진이 좋아요 100개인 사진 위에 올라가는 것을 방지
- 동시에, 좋아요 비율이 높은 사진이 절대 수가 적더라도 합리적으로 평가됨

### 2. Time Decay (가중치: 25%)

최신 사진에 가산점을 부여해 새로 참여한 사람의 사진이 초기에 노출될 기회를 제공한다.

```
age_hours = (현재시각 - 업로드시각) / 3600000
time_boost = 2^(-age_hours / half_life)
half_life = 12시간
```

- 업로드 직후: time_boost = 1.0 (최대)
- 12시간 후: time_boost = 0.5
- 24시간 후: time_boost = 0.25
- 48시간 후: time_boost = 0.0625

이 방식으로 새 사진은 약 12~24시간 동안 상위 노출 부스트를 받고, 이후에는 자연스럽게 Wilson Score와 탐색 보너스에 의한 경쟁으로 전환된다.

### 3. Exploration Bonus (가중치: 35%)

투표를 적게 받은 사진에 더 높은 탐색 보너스를 부여한다.
플랫폼 전체의 투표 활성화를 유도하는 핵심 요소이다.

```
avg_votes = 전체 투표 수 / 전체 사진 수
exploration = 1 / (1 + votes / avg_votes)
```

- 투표 0개: exploration = 1.0 (최대)
- 평균 투표 수만큼 받은 사진: exploration = 0.5
- 평균의 2배: exploration = 0.33
- 평균의 10배: exploration = 0.09

투표를 적게 받은 사진일수록 높은 보너스를 받아 피드 상단에 노출될 확률이 높아지고, 유저가 아직 투표하지 않은 사진을 발견하게 되어 투표 행위 자체를 촉진한다.

### 4. Velocity Penalty - 투표 급등 억제

단시간에 비정상적으로 투표가 몰린 사진의 점수를 억제한다.
단톡방 공유 등으로 특정 사진에 투표가 급격히 몰리는 어뷰징을 자동 감지하는 역할이다.

```
velocity = votes / age_hours              (사진별 시간당 투표 수)
median_velocity = 전체 사진의 velocity 중앙값  (정상 속도 기준선)
velocity_ratio = velocity / median_velocity

velocity_ratio <= 3  ->  penalty = 1.0 (패널티 없음)
velocity_ratio > 3   ->  penalty = 1 / (1 + log2(velocity_ratio / 3))
```

동작 방식:

- 전체 사진의 투표 속도 중앙값을 기준선으로 설정
- 기준선의 3배 이내: 정상 범위로 판단, 패널티 없음
- 기준선의 3배 초과: 로그 스케일로 점수 감쇠

예시 (중앙값 = 시간당 1표 기준):

- 시간당 2표: ratio 2 -> penalty 1.0 (정상)
- 시간당 3표: ratio 3 -> penalty 1.0 (경계, 아직 정상)
- 시간당 6표: ratio 6 -> penalty 0.5 (점수 50% 감소)
- 시간당 12표: ratio 12 -> penalty 0.34 (점수 66% 감소)
- 시간당 24표: ratio 24 -> penalty 0.25 (점수 75% 감소)

특징:

- 중앙값 기반이므로 플랫폼 전체 투표량이 늘어도 자동 조정됨
- 로그 스케일 감쇠이므로 인기 사진이 완전히 매장되지는 않음
- 3배 임계값으로 자연스러운 인기와 어뷰징을 구분

### 5. Random Jitter (변동 범위: 0.85 ~ 1.15)

세션별로 고정된 시드와 사진 ID를 조합한 결정론적 난수로 최종 점수에 변동을 준다.

```
seed = session_seed * 2147483647 + id.charCodeAt(0) * 31 + id.charCodeAt(1) * 17
jitter = 0.85 + xorshift(seed) * 0.3
```

- 같은 세션 내에서는 순서가 일관됨 (새로고침해도 동일)
- 다른 세션에서는 다른 순서 -> 재방문 시 새로운 피드 경험
- +/-15% 범위이므로 상위권 사진이 크게 밀려나지 않으면서도 중위권 사진들의 순서가 섞임

## 가중치 설계 근거

| 요소 | 가중치/역할 | 이유 |
|---|---|---|
| Wilson Score | 0.4 | 좋아요 기반 품질 평가가 메인이 되어야 하므로 가장 높은 비중 |
| Exploration | 0.35 | 투표 활성화가 플랫폼 핵심 목표이므로 높은 비중 배정 |
| Time Decay | 0.25 | 초기 노출 보장은 필요하지만 과도하면 최신순과 차이 없음 |
| Velocity Penalty | 승수 (0.25~1.0) | 가중합 이후 곱셈으로 적용, 어뷰징 시 전체 점수를 감쇠 |
| Random Jitter | 승수 (0.85~1.15) | 최종 점수에 세션별 변동 부여 |

## 정렬 옵션

| 옵션 | 설명 |
|---|---|
| 추천 (기본값) | Wilson Score + Time Decay + Exploration + Velocity Penalty + Jitter |
| 랜덤 | XORShift PRNG 기반 Fisher-Yates 셔플 (세션별 고정) |
| 최신순 | 업로드 시각 내림차순 |

## 효과 시나리오

현재 플랫폼 규모 기준 (좋아요 상위 20~30개, 전체 사진 수십 장)

### Case 1: 좋아요 25개, 올린지 2일, 자연스럽게 쌓인 투표

- Wilson Score: 높음
- Exploration: 낮음
- Velocity Penalty: 1.0 (시간당 ~0.5표, 정상 범위)
- 결과: Wilson이 캐리해 상위권에 안정적으로 위치

### Case 2: 좋아요 0개, 방금 업로드한 사진

- Wilson Score: 0
- Time Decay: 1.0 (최대)
- Exploration: 1.0 (최대)
- Velocity Penalty: 1.0 (투표 없으므로)
- 결과: 0.25 + 0.35 = 0.60 -> 중상위권에 노출, 투표받을 기회 확보

### Case 3: 좋아요 3개, 업로드 2일 경과

- Wilson Score: 낮음
- Time Decay: 매우 낮음 (0.0625)
- Exploration: 높음 (평균 이하이므로)
- Velocity Penalty: 1.0 (정상)
- 결과: Exploration 보너스로 중위권에 위치, 가끔 Jitter로 상위 노출

### Case 4: 좋아요 15개, 업로드 6시간 경과, 자연 유입

- Wilson Score: 중간
- Time Decay: 0.7 (비교적 높음)
- Exploration: 중간
- Velocity Penalty: 1.0 (시간당 ~2.5표, 3배 이내)
- 결과: 모든 요소가 균형 -> 상위~중위에 위치

### Case 5: 좋아요 20개, 업로드 2시간 경과, 단톡방 홍보 의심

- Wilson Score: 중간~높음
- Time Decay: 0.9 (매우 최근)
- Exploration: 낮음
- Velocity Penalty: ~0.4 (시간당 10표, 중앙값 대비 급등)
- 결과: 높은 Wilson에도 불구하고 Velocity Penalty가 전체 점수를 60% 감소시켜 중위권으로 하락. 시간이 지나면서 velocity가 정상화되면 자연스럽게 복귀

## 구현 위치

- 알고리즘 로직: `web/src/components/masonry-gallery.tsx` (sorted useMemo 내부)
- 클라이언트 사이드에서 계산 (서버 부하 없음)
- 모든 사진 데이터를 한 번에 로드한 후 정렬 수행

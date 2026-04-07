# 피드 추천 정렬 알고리즘

## 개요

사진 고연전 플랫폼의 피드 정렬에 사용되는 추천 알고리즘이다.
단순 좋아요 순이나 랜덤이 아닌, 통계적 공정성과 탐색 기회를 동시에 보장하는 방식으로 설계했다.
또한 단시간 비정상적 투표 급등(억지 홍보)을 감지하여 자동으로 점수를 억제하는 메커니즘과, 유저별 개인화된 피드를 제공하는 기능을 포함한다.

## 목표

- 좋아요가 많은 사진은 상위에 자주 노출
- 좋아요가 적거나 없는 사진도 발견될 기회 보장
- 새로 올라온 사진에 초기 노출 부스트 제공
- 매 세션마다 약간씩 다른 피드 순서로 재방문 유도
- 단시간 투표 급등(어뷰징) 감지 및 억제
- 유저별 개인화된 피드 제공 (이미 투표한 사진 하향 배치)
- 투표를 거의 못 받은 사진이 상단에 지속 노출되는 것 방지

## 알고리즘 구성

최종 점수는 5가지 요소의 가중합에 속도 패널티, 개인화 계수, 랜덤 변동을 곱한 값이다.

```
score = (wilson * 0.35 + time_boost * 0.2 + exploration * 0.25 + mid_boost * 0.2) * velocity_penalty * voted_demote * jitter
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
raw_exploration = 1 / (1 + votes / avg_votes)

quality_threshold = avg_votes * 0.3
quality_gate = (votes >= threshold 또는 age < 6시간) ? 1.0 : 0.3 + 0.7 * (votes / threshold)

exploration = raw_exploration * quality_gate
```

- 투표 0개: raw_exploration = 1.0이지만, quality_gate에 의해 감쇠
- 평균 투표 수만큼 받은 사진: exploration = 0.5 (quality_gate 통과)
- 평균의 2배: exploration = 0.33
- 평균의 10배: exploration = 0.09

Quality Gate는 투표를 거의 못 받은 사진이 exploration 보너스만으로 계속 상단에 머무르는 것을 방지한다.

- 평균의 30% 이상 투표를 받았거나 업로드 6시간 이내인 사진은 quality_gate = 1.0 (제한 없음)
- 그 외: 투표가 적을수록 exploration 보너스가 최대 70%까지 감쇠
- 새 사진은 6시간 동안 quality gate 면제 -> 초기 노출 기회 보장 후, 투표를 받지 못하면 서서히 하락

투표를 적게 받은 사진에 발견 기회를 주되, 지속적으로 무관심한 사진이 상단을 차지하지 않도록 균형을 잡는다.

### 3-1. Mid-tier Boost - 중간층 부스트 (가중치: 20%)

좋아요가 평균 부근인 "괜찮은데 묻혀있는" 사진을 끌어올린다.
Wilson Score는 표가 많을수록, Exploration은 적을수록 유리한 구조라 중간층이 가장 푸시를 못 받는 문제를 보완한다.

```
mid_target = avg_votes
mid_range = avg_votes * 0.5
diff = (votes - mid_target) / mid_range
mid_boost = exp(-diff^2)   (가우시안)
```

평균 8표 기준:

- 4표: 0.37
- 6표: 0.78
- 8표 (평균): 1.0 (최대)
- 10표: 0.78
- 12표: 0.37
- 16표 이상: 0.02 이하

평균을 sweet spot으로 잡고 가우시안 분포로 부스트를 주기 때문에, 평균 부근의 사진들이 자연스럽게 상위에 올라온다. 너무 많이 받은 사진은 Wilson Score가 캐리하므로 손해 없고, 너무 적게 받은 사진은 Exploration이 캐리한다.

### 4. Peak Velocity Penalty - 투표 급등 억제 (회복 가능)

역대 최고 1시간 투표 수(peak velocity)를 기록하여 어뷰징 이력을 영구히 추적한다.
단순히 시간이 흐른다고 패널티가 풀리지 않으며, 정상 페이스로 추가 투표가 누적되어야만 점진적으로 회복된다.

```
peak_velocity = max(1시간 슬라이딩 윈도우 내 투표 수)

# Base Penalty (peak 기준)
peak <= 10  ->  base = 1.0
10 < peak <= 20  ->  base = 1.0 - 0.5 * (peak - 10) / 10  (선형 감쇠)
peak > 20  ->  base = 0.5 / (1 + log2(peak / 20))  (로그 감쇠)

# Recovery (정상 투표 누적량 기반)
normal_votes_since_peak = peak 이후 들어온 투표 중 1시간 윈도우 내 10표 이하 페이스인 것
recovery_threshold = max(avg_votes * 5, 15)  (전체 평균의 5배)
recovery_rate = min(normal_votes_since_peak / recovery_threshold, 1.0)

final_penalty = base + (1 - base) * recovery_rate * 0.8  (최대 80%까지만 회복)
```

핵심 동작:

- **이력 영구 추적**: peak velocity는 한 번 기록되면 사라지지 않음. 시간만 흘렀다고 패널티가 풀리지 않음
- **회복은 정상 투표량에 비례**: 어뷰징 이후에도 자연스럽게 투표가 쌓이면 점진적으로 회복
- **회복 임계값은 동적**: 플랫폼 전체 평균 투표 수의 3배 (규모에 자동 맞춰짐)
- **완전 회복 가능**: 진짜 좋은 사진이라 정상 투표가 충분히 쌓이면 패널티 해제 후 1등도 가능

예시 (avg_votes = 8, recovery_threshold = 24):

- peak 5표: base 1.0 (정상)
- peak 15표: base 0.75 (이후 24표 정상 투표 받으면 1.0 회복)
- peak 25표: base 0.37 (이후 24표 정상 투표 받으면 1.0 회복)
- peak 31표 + 정상 투표 0표: penalty 0.31 (강한 패널티 유지)
- peak 31표 + 정상 투표 12표: penalty ≈ 0.66 (절반 회복)
- peak 31표 + 정상 투표 24표 이상: penalty 1.0 (완전 회복)

특징:

- 어뷰징 직후 시간만 지났다고 패널티가 풀리는 문제 해결
- 진짜 좋은 사진은 충분한 정상 투표로 완전 회복하여 정당한 1등 가능
- 어뷰징만 했고 실제 매력이 없으면 영구히 하위에 머무름
- 회복 임계값이 평균의 3배라 어뷰징 사진은 "평균보다 훨씬 많이 받아야" 정상화됨

### 5. Random Jitter (변동 범위: 0.85 ~ 1.15)

세션별로 고정된 시드와 사진 ID를 조합한 결정론적 난수로 최종 점수에 변동을 준다.

```
seed = session_seed * 2147483647 + id.charCodeAt(0) * 31 + id.charCodeAt(1) * 17
jitter = 0.85 + xorshift(seed) * 0.3
```

- 같은 세션 내에서는 순서가 일관됨 (새로고침해도 동일)
- 다른 세션에서는 다른 순서 -> 재방문 시 새로운 피드 경험
- +/-15% 범위이므로 상위권 사진이 크게 밀려나지 않으면서도 중위권 사진들의 순서가 섞임

### 6. Voted Demote - 개인화 (승수: 0.4 또는 1.0)

로그인한 유저가 이미 투표한 사진의 점수를 60% 감소시킨다.

```
voted_demote = 이미 투표한 사진 ? 0.4 : 1.0
```

- 이미 투표한 사진은 아래로 밀려남 -> 아직 안 본 사진 위주로 피드 구성
- 완전히 제거하지 않고 0.4를 곱하여 하단에는 여전히 노출 (재확인 가능)
- 투표할 때마다 실시간으로 피드 순서가 재계산됨
- 유저마다 투표 이력이 다르므로 같은 시간에 접속해도 서로 다른 피드를 보게 됨

## 가중치 설계 근거

| 요소 | 가중치/역할 | 이유 |
|---|---|---|
| Wilson Score | 0.35 | 좋아요 기반 품질 평가가 메인이지만, 단독 캐리하지 않게 비중 조정 |
| Exploration | 0.25 | 적게 받은 사진의 발견 기회 보장 |
| Time Decay | 0.2 | 새 사진 초기 노출 보장 |
| Mid-tier Boost | 0.2 | 평균 부근의 묻힌 사진 끌어올림 |
| Velocity Penalty | 승수 (0.17~1.0) | 가중합 이후 곱셈으로 적용, 어뷰징 시 전체 점수를 감쇠 |
| Voted Demote | 승수 (0.4 또는 1.0) | 이미 투표한 사진 하향, 유저별 개인화 |
| Quality Gate | Exploration에 적용 (0.3~1.0) | 투표 못 받은 사진의 상단 고착 방지 |
| Random Jitter | 승수 (0.85~1.15) | 최종 점수에 세션별 변동 부여 |

## 학교별 공정 노출 (Stride Scheduling)

"전체" 필터에서는 점수 기반 정렬을 한 후, 두 학교(고대/연대) 사진을 비율에 맞춰 인터리브한다.
단순히 점수순으로 나열하면 사진 수가 많은 학교가 상위를 독점할 수 있고, 단순 번갈아 배치(고-연-고-연)는 한쪽이 일찍 소진되어 끝부분에 몰리는 문제가 있다.

Stride Scheduling 방식:

```
korea_step = total / korea_count
yonsei_step = total / yonsei_count

각 학교에 카운터를 두고, 카운터가 작은(더 "차례인") 학교를 픽
픽한 후 해당 학교 카운터에 step만큼 더함
```

예시 (고대 30장, 연대 16장, 총 46장):

- korea_step = 46/30 ≈ 1.53
- yonsei_step = 46/16 ≈ 2.88
- 결과: 고대가 약 2번 나오고 연대가 1번 나오는 패턴이 처음부터 끝까지 균등 유지
- 한쪽이 먼저 소진되지 않고 양쪽이 거의 동시에 끝남

특징:

- 학교별 내부 순위는 알고리즘 결과 그대로 유지 (좋은 사진이 학교 안에서 위로 감)
- 사진 수 비율에 자동 적응 (50:50 고정이 아님)
- 학교 필터 적용 시(고대/연대 단독)에는 인터리브 없이 점수순 그대로

## 정렬 옵션

| 옵션 | 설명 |
|---|---|
| 추천 (기본값) | Wilson Score + Time Decay + Exploration(Quality Gate) + Velocity Penalty + Voted Demote + Jitter |
| 랜덤 | XORShift PRNG 기반 Fisher-Yates 셔플 (세션별 고정) |
| 최신순 | 업로드 시각 내림차순 |

## 효과 시나리오

현재 플랫폼 규모 기준 (좋아요 상위 20~30개, 전체 사진 수십 장)

### Case 1: 좋아요 25개, 올린지 2일, 아직 투표 안 한 유저

- Wilson Score: 높음
- Exploration: 낮음
- Velocity Penalty: 1.0 (시간당 ~0.5표, 정상)
- Voted Demote: 1.0 (미투표)
- 결과: Wilson이 캐리해 상위권에 안정적으로 위치

### Case 2: 좋아요 25개, 올린지 2일, 이미 투표한 유저

- Wilson Score: 높음
- Voted Demote: 0.4 (이미 투표)
- 결과: 점수가 60% 감소하여 중하위권으로 밀림. 대신 아직 안 본 사진이 위로 올라옴

### Case 3: 좋아요 0개, 방금 업로드한 사진

- Wilson Score: 0
- Time Decay: 1.0 (최대)
- Exploration: 1.0 (quality gate 면제, 6시간 이내)
- 결과: 0.25 + 0.35 = 0.60 -> 중상위권에 노출, 투표받을 기회 확보

### Case 4: 좋아요 1개, 업로드 2일 경과 (평균 대비 매우 낮음)

- Wilson Score: 매우 낮음
- Time Decay: 매우 낮음 (0.0625)
- Exploration: raw는 높지만, quality gate에 의해 감쇠 (평균 30% 미달)
- 결과: quality gate가 exploration 보너스를 깎아 하위권에 위치. 상단 고착 방지

### Case 5: 좋아요 15개, 업로드 6시간 경과, 자연 유입

- Wilson Score: 중간
- Time Decay: 0.7 (비교적 높음)
- Exploration: 중간
- Velocity Penalty: 1.0 (시간당 ~2.5표, 정상)
- 결과: 모든 요소가 균형 -> 상위~중위에 위치

### Case 6: 좋아요 15개, 업로드 1시간 경과, 단톡방 홍보 의심

- Wilson Score: 중간
- Time Decay: 0.94 (매우 최근)
- Velocity: 시간당 15표 -> penalty = 0.75 (1단계, 점수 25% 감소)
- 결과: 서서히 감쇠 적용되어 상위권에서 밀림

### Case 7: 좋아요 25개, 업로드 1시간 경과, 심한 어뷰징

- Wilson Score: 중간~높음
- Time Decay: 0.94 (매우 최근)
- Velocity: 시간당 25표 -> penalty = 약 0.37 (2단계, 점수 63% 감소)
- 결과: 2단계 패널티로 하위권 하락. 시간이 지나 velocity 정상화되면 복귀

## 구현 위치

- 알고리즘 로직: `web/src/components/masonry-gallery.tsx` (sorted useMemo 내부)
- 클라이언트 사이드에서 계산 (서버 부하 없음)
- 모든 사진 데이터를 한 번에 로드한 후 정렬 수행

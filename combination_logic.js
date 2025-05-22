// combination_logic.js

// 두 숫자 객체가 인접해 있는지 확인하는 함수 - 개선된 버전
function isAdjacent(a, b) {
  // 기본 임계값
  const threshold = 60; // 인접성 판단을 위한 거리 임계값 (증가됨)

  // 두 숫자 중심점 계산
  const ax = (a.bbox.x0 + a.bbox.x1) / 2;
  const ay = (a.bbox.y0 + a.bbox.y1) / 2;
  const bx = (b.bbox.x0 + b.bbox.x1) / 2;
  const by = (b.bbox.y0 + b.bbox.y1) / 2;

  // 맨해튼 거리와 유클리드 거리를 모두 계산
  const manhattanDist = Math.abs(ax - bx) + Math.abs(ay - by);
  const euclideanDist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

  // 두 거리 모두 임계값 이내이면 인접으로 간주
  return euclideanDist < threshold || manhattanDist < threshold * 1.5;
}

// 숫자 배열에서 합이 10인 인접 조합을 찾는 함수 (DFS 기반)
function findCombinations(originalNumbers) {
  const results = [];
  if (!originalNumbers || originalNumbers.length === 0) {
    return results;
  }

  const numbersWithIndex = originalNumbers.map((num, index) => ({
    ...num,
    originalIndex: index,
  }));

  const uniqueCombinationSignatures = new Set();

  function dfs(lastAddedNode, currentPath, currentSum) {
    if (currentSum === 10 && currentPath.length >= 2) {
      const sortedPath = [...currentPath].sort(
        (a, b) => a.originalIndex - b.originalIndex
      );
      const signature = sortedPath.map((n) => n.originalIndex).join(",");
      if (!uniqueCombinationSignatures.has(signature)) {
        uniqueCombinationSignatures.add(signature);
        results.push(sortedPath.map(numWithIdx => originalNumbers[numWithIdx.originalIndex]));
      }
      return; 
    }

    if (currentSum > 10) {
      return;
    }

    for (let i = 0; i < numbersWithIndex.length; i++) {
      const potentialNextNode = numbersWithIndex[i];
      if (currentPath.some(pNum => pNum.originalIndex === potentialNextNode.originalIndex)) {
        continue;
      }
      if (!isAdjacent(lastAddedNode, potentialNextNode)) {
        continue;
      }
      currentPath.push(potentialNextNode);
      dfs(potentialNextNode, currentPath, currentSum + potentialNextNode.value);
      currentPath.pop();
    }
  }

  for (let i = 0; i < numbersWithIndex.length; i++) {
    const startNode = numbersWithIndex[i];
    dfs(startNode, [startNode], startNode.value);
  }
  return results;
}

// For Jest testing environment, explicitly attach to global
if (typeof global !== 'undefined') {
  global.isAdjacent = isAdjacent;
  global.findCombinations = findCombinations;
}

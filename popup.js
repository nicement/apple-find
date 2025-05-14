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

// 숫자 배열에서 합이 10인 인접 조합을 찾는 함수
function findCombinations(numbers) {
  const result = [];
  for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) {
      if (
        isAdjacent(numbers[i], numbers[j]) &&
        numbers[i].value + numbers[j].value === 10
      ) {
        result.push([numbers[i], numbers[j]]);
      }
    }
  }
  return result;
}

// 이미지에서 빨간 사과와 흰색 숫자를 찾는 함수
async function processImage(dataUrl) {
  return new Promise((resolve, reject) => {
    // 원본 이미지용 캔버스
    const canvasOriginal = document.getElementById("canvas-original");
    const ctxOriginal = canvasOriginal.getContext("2d", {
      willReadFrequently: true,
    });

    // 결과 표시용 캔버스
    const canvasResult = document.getElementById("canvas-result");
    const ctxResult = canvasResult.getContext("2d", {
      willReadFrequently: true,
    });

    // 함께 보기용 작은 캔버스들
    const canvasOriginalSmall = document.getElementById(
      "canvas-original-small"
    );
    const ctxOriginalSmall = canvasOriginalSmall.getContext("2d");
    const canvasResultSmall = document.getElementById("canvas-result-small");
    const ctxResultSmall = canvasResultSmall.getContext("2d");

    const img = new Image();

    img.onload = () => {
      // 모든 캔버스 크기를 이미지에 맞게 조정
      canvasOriginal.width = img.width;
      canvasOriginal.height = img.height;
      canvasResult.width = img.width;
      canvasResult.height = img.height;

      // 작은 캔버스는 비율을 유지하면서 크기 조정
      const aspectRatio = img.width / img.height;
      const smallWidth = 450;
      const smallHeight = Math.floor(smallWidth / aspectRatio);
      canvasOriginalSmall.width = smallWidth;
      canvasOriginalSmall.height = smallHeight;
      canvasResultSmall.width = smallWidth;
      canvasResultSmall.height = smallHeight;

      // 원본 이미지를 모든 캔버스에 그리기
      ctxOriginal.drawImage(img, 0, 0);
      ctxResult.drawImage(img, 0, 0);
      ctxOriginalSmall.drawImage(img, 0, 0, smallWidth, smallHeight);
      ctxResultSmall.drawImage(img, 0, 0, smallWidth, smallHeight);

      // 사과(빨간색 영역) 감지 - 결과 캔버스에서만 작업
      const apples = detectApples(canvasResult, ctxResult);
      console.log(`${apples.length}개의 사과 감지됨`);

      // 각 사과 영역에서 숫자 인식
      const numbers = [];
      apples.forEach((apple, index) => {
        const detectedNumber = detectNumberInApple(ctxResult, apple);
        if (detectedNumber) {
          numbers.push({
            value: detectedNumber.value,
            bbox: {
              x0: apple.x,
              y0: apple.y,
              x1: apple.x + apple.width,
              y1: apple.y + apple.height,
            },
            apple: index,
          });
        }
      });

      console.log(`${numbers.length}개의 숫자 인식됨:`, numbers);

      // 결과 캔버스에 시각화 (강조 포함)
      visualizeResults(
        canvasResult,
        ctxResult,
        apples,
        numbers,
        findCombinations(numbers)
      );

      // 작은 결과 캔버스에도 시각화 (비율에 맞게 조정)
      ctxResultSmall.clearRect(0, 0, smallWidth, smallHeight);
      ctxResultSmall.drawImage(canvasResult, 0, 0, smallWidth, smallHeight);

      // 2차원 배열 표시
      displayNumbersGrid(numbers);

      // 기본 뷰 설정 (결과 이미지)
      showView("result");

      resolve(numbers);
    };

    img.onerror = (err) => {
      reject(new Error("이미지 로드 실패"));
    };

    img.src = dataUrl;
  });
}

// 빨간 사과(빨간색 영역) 감지 함수
function detectApples(canvas, ctx) {
  const apples = [];
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 방문한 픽셀을 추적하는 배열
  const visited = new Array(canvas.width * canvas.height).fill(false);

  // 각 픽셀을 확인하며 빨간색 영역 찾기
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;

      // 이미 방문했거나 빨간색이 아니면 건너뛰기
      if (
        visited[y * canvas.width + x] ||
        !isRedPixel(data[idx], data[idx + 1], data[idx + 2])
      ) {
        continue;
      }

      // 빨간색 영역 찾기 (flood fill)
      const region = floodFill(
        x,
        y,
        canvas.width,
        canvas.height,
        data,
        visited
      );

      // 최소 크기 이상인 경우만 사과로 간주
      if (region.width * region.height > 100) {
        apples.push(region);
      }
    }
  }

  return apples;
}

// 빨간색 픽셀인지 확인하는 함수
function isRedPixel(r, g, b) {
  // 빨간색 사과의 RGB 특성 (더 정확한 버전)
  // 사과는 보통 밝은 빨간색
  const isBrightRed =
    r > 150 && r > g * 1.5 && r > b * 1.5 && r - g > 60 && r - b > 60;

  // 어두운 빨간색도 포함
  const isDarkRed =
    r > 100 &&
    r > g * 1.3 &&
    r > b * 1.3 &&
    r - g > 40 &&
    r - b > 40 &&
    r < 150;

  return isBrightRed || isDarkRed;
}

// Flood fill 알고리즘으로 연결된 영역 찾기
function floodFill(startX, startY, width, height, data, visited) {
  const queue = [{ x: startX, y: startY }];
  let minX = startX,
    maxX = startX,
    minY = startY,
    maxY = startY;

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    const idx = (y * width + x) * 4;

    // 이미 방문했거나 유효하지 않은 좌표이면 건너뛰기
    if (x < 0 || y < 0 || x >= width || y >= height || visited[y * width + x]) {
      continue;
    }

    // 빨간색이 아니면 건너뛰기
    if (!isRedPixel(data[idx], data[idx + 1], data[idx + 2])) {
      continue;
    }

    // 방문 표시
    visited[y * width + x] = true;

    // 영역의 경계 갱신
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // 상하좌우 픽셀을 큐에 추가
    queue.push({ x: x + 1, y: y });
    queue.push({ x: x - 1, y: y });
    queue.push({ x: x, y: y + 1 });
    queue.push({ x: x, y: y - 1 });
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

// 사과 영역에서 흰색 숫자 인식
function detectNumberInApple(ctx, apple) {
  // 사과 영역 추출
  const appleImageData = ctx.getImageData(
    apple.x,
    apple.y,
    apple.width,
    apple.height
  );
  const data = appleImageData.data;

  // "붉은색이 아닌" 픽셀 카운팅으로 변경
  let nonRedPixels = [];
  for (let y = 0; y < apple.height; y++) {
    for (let x = 0; x < apple.width; x++) {
      const idx = (y * apple.width + x) * 4;
      // 픽셀의 알파 채널이 0보다 큰 경우 (완전히 투명하지 않은 픽셀)
      // 그리고 붉은색이 아닌 픽셀인지 확인
      if (
        data[idx + 3] > 0 &&
        !isRedPixel(data[idx], data[idx + 1], data[idx + 2])
      ) {
        nonRedPixels.push({ x, y });
      }
    }
  }

  // 디버깅 정보
  console.log(
    `사과 크기: ${apple.width}x${apple.height}, 붉은색 아닌 픽셀 수: ${nonRedPixels.length}`
  );

  // Create a lookup for non-red pixels (number candidates)
  const nonRedPixelSet = new Set();
  nonRedPixels.forEach((p) => nonRedPixelSet.add(`${p.x},${p.y}`));

  // 사과 내부 이미지 표시 (디버깅용)
  const appleCanvas = document.createElement("canvas");
  appleCanvas.width = apple.width;
  appleCanvas.height = apple.height;
  const appleCtx = appleCanvas.getContext("2d");

  // 배경을 흰색으로 채우기
  appleCtx.fillStyle = "white";
  appleCtx.fillRect(0, 0, appleCanvas.width, appleCanvas.height);

  // Create new ImageData for the masked apple display
  const maskedDisplayImageData = appleCtx.createImageData(
    apple.width,
    apple.height
  );
  const maskedDisplayData = maskedDisplayImageData.data;

  for (let y = 0; y < apple.height; y++) {
    for (let x = 0; x < apple.width; x++) {
      const currentPixelIndex = (y * apple.width + x) * 4;
      const r = data[currentPixelIndex];
      const g = data[currentPixelIndex + 1];
      const b = data[currentPixelIndex + 2];
      const a = data[currentPixelIndex + 3];

      if (a === 0) {
        // If original pixel is transparent, keep new one transparent
        maskedDisplayData[currentPixelIndex + 3] = 0;
        continue;
      }

      if (isRedPixel(r, g, b)) {
        // Apple body pixel
        maskedDisplayData[currentPixelIndex] = r;
        maskedDisplayData[currentPixelIndex + 1] = g;
        maskedDisplayData[currentPixelIndex + 2] = b;
        maskedDisplayData[currentPixelIndex + 3] = a;
      } else {
        // Non-red pixel. Check if it's part of the identified number.
        if (nonRedPixelSet.has(`${x},${y}`)) {
          // Number pixel
          maskedDisplayData[currentPixelIndex] = r;
          maskedDisplayData[currentPixelIndex + 1] = g;
          maskedDisplayData[currentPixelIndex + 2] = b;
          maskedDisplayData[currentPixelIndex + 3] = a;
        } else {
          // Background pixel within bounding box (non-red, non-number)
          // Make it transparent so white canvas background shows through
          maskedDisplayData[currentPixelIndex + 3] = 0;
        }
      }
    }
  }

  // Draw the masked image data onto the canvas
  appleCtx.putImageData(maskedDisplayImageData, 0, 0);

  // 붉은색 아닌 픽셀 시각화 (디버깅용) - on top of the masked image
  appleCtx.fillStyle = "rgba(0, 0, 255, 0.5)"; // 파란색으로 시각화하여 구분
  nonRedPixels.forEach((pixel) => {
    appleCtx.fillRect(pixel.x, pixel.y, 1, 1);
  });

  console.log(
    "사과 내부 이미지 (붉은색 아닌 픽셀 파란색으로 표시, 배경 마스크 처리):",
    appleCanvas.toDataURL()
  );

  // === 가운데 세로줄 3개 strip 이미지를 잘라서 콘솔에 표시 ===
  // 1. nonRedPixels의 bounding box 계산
  let minX = apple.width,
    maxX = 0,
    minY = apple.height,
    maxY = 0;
  nonRedPixels.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  if (minX >= maxX || minY >= maxY) {
    // 픽셀이 없으면 skip
  } else {
    // 가운데 strip의 x 범위 계산 (중앙 3분할)
    const boxWidth = maxX - minX + 1;
    const centerStripWidth = Math.round(boxWidth / 3);
    const centerX = Math.round((minX + maxX) / 2);
    const stripX0 = Math.max(minX, centerX - Math.floor(centerStripWidth / 2));
    const stripX1 = Math.min(maxX, stripX0 + centerStripWidth - 1);
    const stripY0 = Math.round((maxY / 5) * 1);
    const stripY1 = Math.round((maxY / 5) * 4);
    const stripW = stripX1 - stripX0 + 1;
    const stripH = stripY1 - stripY0 + 1;

    // 별도 캔버스에 잘라서 그리기
    const stripCanvas = document.createElement("canvas");
    stripCanvas.width = stripW;
    stripCanvas.height = stripH;
    const stripCtx = stripCanvas.getContext("2d");
    // appleCanvas에서 해당 영역만 복사
    stripCtx.drawImage(
      appleCanvas,
      stripX0,
      stripY0,
      stripW,
      stripH, // src
      0,
      0,
      stripW,
      stripH // dest
    );
    console.log(
      "가운데 세로줄 3개 영역 strip 이미지:",
      stripCanvas.toDataURL()
    );

    // === strip 이미지에서 픽셀 추출 후 숫자 인식 ===
    // stripCanvas에서 이미지 데이터 추출
    const stripImageData = stripCtx.getImageData(0, 0, stripW, stripH);
    const stripData = stripImageData.data;
    let stripBluePixels = [];
    for (let y = 0; y < stripH; y++) {
      for (let x = 0; x < stripW; x++) {
        const idx = (y * stripW + x) * 4;

        if (
          stripData[idx + 3] > 0 &&
          isBluePixel(stripData[idx], stripData[idx + 1], stripData[idx + 2])
        ) {
          stripBluePixels.push({ x, y });
        }
      }
    }
    console.log(`stripBluePixels: ${stripBluePixels.length}`);
    // stripBluePixels를 기반으로 숫자 인식
    if (stripBluePixels.length > 5) {
      const number = recognizeNumberFromPattern(
        stripBluePixels,
        stripW,
        stripH
      );
      console.log(`인식된 숫자: ${number}`);
      if (number !== null) {
        return { value: number };
      }
    }
    return null;
  }
  // === 끝 ===

  // 붉은색 아닌 픽셀이 충분히 있으면 숫자로 간주 (최소 픽셀 수 조정 가능)
  if (nonRedPixels.length > 5) {
    // 최소 픽셀 수를 5로 조정 (기존 10)
    const number = recognizeNumberFromPattern(
      nonRedPixels,
      apple.width,
      apple.height
    );
    if (number !== null) {
      return { value: number };
    }
  }

  return null;
}

// 파란색 픽셀인지 확인하는 함수 (strip 이미지에서 숫자 후보)
function isBluePixel(r, g, b) {
  // 파란색(강조) 픽셀: R,G는 낮고 B는 높음
  return b > 180 && r < 128 && g < 128;
}

// --- 숫자 패턴 그리드(정답) 테이블 ---
const DIGIT_GRIDS = [
  null, // 0 없음
  [
    // 1
    [0.083, 0.167, 0],
    [0, 0.111, 0],
    [0, 0.111, 0],
    [0, 0.111, 0],
    [0.111, 0.167, 0.139],
  ],
  [
    // 2
    [0.087, 0.126, 0.087],
    [0, 0, 0.087],
    [0, 0.039, 0.078],
    [0.01, 0.097, 0.01],
    [0.117, 0.146, 0.117],
  ],
  [
    // 3
    [0.067, 0.114, 0.086],
    [0, 0.01, 0.086],
    [0.019, 0.124, 0.086],
    [0, 0.01, 0.105],
    [0.086, 0.086, 0.124],
  ],
  [
    // 4
    [0, 0.078, 0.069],
    [0.017, 0.103, 0.052],
    [0.103, 0.078, 0.078],
    [0.103, 0.103, 0.103],
    [0, 0.034, 0.078],
  ],
  [
    // 5
    [0.07, 0.113, 0.078],
    [0.078, 0.043, 0.009],
    [0.061, 0.078, 0.113],
    [0, 0, 0.078],
    [0.078, 0.087, 0.113],
  ],
  [
    // 6
    [0.053, 0.083, 0.089],
    [0.089, 0.024, 0.012],
    [0.095, 0.053, 0.107],
    [0.089, 0, 0.077],
    [0.053, 0.083, 0.095],
  ],
  [
    // 7
    [0.143, 0.155, 0.155],
    [0, 0.06, 0.06],
    [0, 0.155, 0.012],
    [0, 0.119, 0],
    [0, 0.143, 0],
  ],
  [
    // 8
    [0.067, 0.089, 0.067],
    [0.067, 0.007, 0.067],
    [0.067, 0.119, 0.059],
    [0.067, 0.007, 0.074],
    [0.089, 0.067, 0.089],
  ],
  [
    // 9
    [0.121, 0.069, 0.086],
    [0.069, 0, 0.103],
    [0.086, 0.052, 0.103],
    [0, 0.017, 0.086],
    [0.086, 0.069, 0.052],
  ],
];

// 두 3x5 grid의 유사도(0~1, 1이 완전일치) 계산 (L1 distance 기반)
function gridSimilarity(gridA, gridB) {
  let sum = 0;
  let diff = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const a = gridA[row][col];
      const b = gridB[row][col];
      sum += Math.max(a, b);
      diff += Math.abs(a - b);
    }
  }
  // sum==0이면 0, 아니면 1-정규화된 차이
  return sum === 0 ? 0 : 1 - diff / (sum + 1e-6);
}

// grid 기반 숫자 인식 (패턴 테이블과 직접 비교)
function recognizeNumberFromPattern(bluePixels, width, height) {
  if (!bluePixels || bluePixels.length === 0) return null;
  const grid = createNormalizedGrid(bluePixels, width, height);
  let bestDigit = null;
  let bestScore = -Infinity;
  let secondScore = -Infinity;
  let bestIdx = -1;
  for (let digit = 1; digit <= 9; digit++) {
    const refGrid = DIGIT_GRIDS[digit];
    const sim = gridSimilarity(grid, refGrid);
    if (sim > bestScore) {
      secondScore = bestScore;
      bestScore = sim;
      bestDigit = digit;
      bestIdx = digit;
    } else if (sim > secondScore) {
      secondScore = sim;
    }
  }
  console.log(
    `Best digit: ${bestDigit}, Best score: ${bestScore}, Second score: ${secondScore}`
  );
  // 임계값: 0.80 이상, 1~2위 차이 0.07 이상일 때만 인정
  if (bestScore > 0.7 && bestScore - secondScore > 0.07) {
    return bestDigit;
  }
  return null;
}

// 픽셀 좌표 배열을 3x5 그리드로 정규화하는 함수
function createNormalizedGrid(pixels, width, height) {
  // 3x5 그리드 초기화 (각 셀은 0)
  const grid = Array.from({ length: 5 }, () => [0, 0, 0]);
  if (!pixels || pixels.length === 0) return grid;

  // bounding box 계산 (좌표가 strip/crop 내부에 있을 수 있으므로)
  let minX = width,
    maxX = 0,
    minY = height,
    maxY = 0;
  pixels.forEach(({ x, y }) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  // 최소 크기 보정 (0 division 방지)
  if (maxX === minX) maxX = minX + 1;
  if (maxY === minY) maxY = minY + 1;

  // 각 픽셀을 3x5 그리드에 매핑
  pixels.forEach(({ x, y }) => {
    // bounding box 기준 정규화
    const normX = (x - minX) / (maxX - minX);
    const normY = (y - minY) / (maxY - minY);
    // 3x5 그리드 인덱스
    const col = Math.min(2, Math.max(0, Math.floor(normX * 3)));
    const row = Math.min(4, Math.max(0, Math.floor(normY * 5)));
    grid[row][col] += 1;
  });

  // 각 셀을 픽셀 비율(0~1)로 정규화
  const total = pixels.length;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      grid[row][col] = grid[row][col] / total;
    }
  }
  return grid;
}

// 사과 영역과 인식된 숫자를 캔버스에 시각적으로 표시
function visualizeResults(canvas, ctx, apples, numbers, combos) {
  // 캔버스 초기화
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 원본 이미지 위에 사과 영역 표시
  apples.forEach((apple, index) => {
    ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(apple.x, apple.y, apple.width, apple.height);

    // 사과 인덱스 표시
    ctx.fillStyle = "rgba(255, 0, 0, 0.9)";
    ctx.font = "12px Arial";
    ctx.fillText(`사과#${index}`, apple.x, apple.y - 5);
  });

  // 인식된 숫자 표시
  numbers.forEach((number) => {
    const { x0, y0, x1, y1 } = number.bbox;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    ctx.fillStyle = "rgba(0, 0, 255, 1)";
    ctx.font = "16px Arial";
    ctx.fillText(number.value, (x0 + x1) / 2 - 5, (y0 + y1) / 2 + 5);
  });

  // 합이 10인 조합 강조 표시
  combos.forEach((combo) => {
    const [num1, num2] = combo;
    ctx.strokeStyle = "rgba(0, 255, 0, 0.7)";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      num1.bbox.x0,
      num1.bbox.y0,
      num1.bbox.x1 - num1.bbox.x0,
      num1.bbox.y1 - num1.bbox.y0
    );
    ctx.strokeRect(
      num2.bbox.x0,
      num2.bbox.y0,
      num2.bbox.x1 - num2.bbox.x0,
      num2.bbox.y1 - num2.bbox.y0
    );
  });

  // 캔버스를 표시
  canvas.style.display = "block";
}

// 인식된 숫자를 2차원 배열로 변환하여 표시 - 개선된 버전
function displayNumbersGrid(numbers) {
  // 2D 배열로 변환
  const grid = convertToGrid(numbers);

  // HTML 표시용 문자열 생성
  let html =
    '<div style="font-weight:bold; margin-bottom:10px;">인식된 숫자 배열:</div>';

  // 인식된 숫자 요약 표시
  const totalCount = numbers.length;
  html += `<div style="margin-bottom:10px;">총 <span style="color:blue; font-weight:bold;">${totalCount}개</span>의 숫자가 인식되었습니다.</div>`;

  // 합이 10인 조합 미리 계산
  const combos = findCombinations(numbers);
  html += `<div style="margin-bottom:10px;">합이 10인 조합: <span style="color:red; font-weight:bold;">${combos.length}개</span> 발견됨</div>`;

  // 2D 그리드 표시
  html +=
    '<pre style="background:#f5f5f5;padding:10px;overflow:auto;border-radius:4px;">';

  if (grid.length === 0) {
    html += "[ ] (인식된 숫자 없음)";
  } else {
    html += "[\n";
    grid.forEach((row) => {
      html += "  [";
      row.forEach((cell) => {
        if (cell) {
          // 합이 10인 조합에 포함된 숫자는 다른 색으로 강조
          let isInCombo = false;
          for (const combo of combos) {
            if (combo[0] === cell || combo[1] === cell) {
              isInCombo = true;
              break;
            }
          }

          const style = isInCombo
            ? "color:red;font-weight:bold;background:#ffeeee;padding:0 3px;"
            : "color:blue;";

          html += ` <span style="${style}">${cell.value}</span>,`;
        } else {
          html += " null,";
        }
      });
      html = html.slice(0, -1) + " ],\n"; // 마지막 쉼표 제거
    });
    html += "]";
  }

  html += "</pre>";

  // 조합 목록 표시
  if (combos.length > 0) {
    html +=
      '<div style="margin-top:15px;font-weight:bold;">발견된 조합 리스트:</div>';
    html += '<ul style="background:#f5f5f5;padding:10px;border-radius:4px;">';
    combos.forEach((combo, i) => {
      html += `<li style="margin-bottom:5px;">조합 ${
        i + 1
      }: <span style="color:red;font-weight:bold;">${combo[0].value} + ${
        combo[1].value
      } = 10</span></li>`;
    });
    html += "</ul>";
  }

  // 표시
  document.getElementById("numbers-grid").innerHTML = html;
}

// 인식된 숫자들을 2D 배열로 변환
function convertToGrid(numbers) {
  if (!numbers || numbers.length === 0) return [];

  // 그리드 크기 결정 (간단하게 최대 10x10으로 가정)
  const maxRows = 10;
  const maxCols = 10;

  // 빈 2D 배열 생성
  const grid = Array.from({ length: maxRows }, () => Array(maxCols).fill(null));

  // 각 숫자를 적절한 위치에 배치
  numbers.forEach((number) => {
    const { x0, y0 } = number.bbox;

    // 화면상 좌표를 그리드 인덱스로 변환 (간단한 방식)
    // 이 부분은 실제 사과 배치에 따라 조정이 필요할 수 있음
    const row = Math.min(Math.floor(y0 / 50), maxRows - 1);
    const col = Math.min(Math.floor(x0 / 50), maxCols - 1);

    grid[row][col] = number;
  });

  // 비어있는 행/열 제거
  const trimmedGrid = trimEmptyRowsAndColumns(grid);

  return trimmedGrid;
}

// 비어있는 행과 열을 제거
function trimEmptyRowsAndColumns(grid) {
  // 모든 값이 null인 행 제거
  let trimmedGrid = grid.filter((row) => row.some((cell) => cell !== null));

  if (trimmedGrid.length === 0) return []; // 모든 행이 비어있는 경우

  // 모든 값이 null인 열의 인덱스 찾기
  const colsToKeep = [];
  const width = trimmedGrid[0].length;

  for (let col = 0; col < width; col++) {
    for (let row = 0; row < trimmedGrid.length; row++) {
      if (trimmedGrid[row][col] !== null) {
        colsToKeep.push(col);
        break;
      }
    }
  }

  // 필요한 열만 유지
  if (colsToKeep.length < width) {
    trimmedGrid = trimmedGrid.map((row) => colsToKeep.map((col) => row[col]));
  }

  return trimmedGrid;
}

// 뷰 모드를 전환하는 함수
function showView(viewMode) {
  // 모든 뷰 컨테이너 숨기기
  document.getElementById("canvas-container").style.display = "none";
  document.getElementById("result-container").style.display = "none";
  document.getElementById("side-by-side-container").style.display = "none";

  // 모든 버튼 비활성화
  document
    .querySelectorAll(".view-btn")
    .forEach((btn) => btn.classList.remove("active"));

  // 선택된 뷰와 버튼 활성화
  if (viewMode === "original") {
    document.getElementById("canvas-container").style.display = "block";
    document.getElementById("btn-original").classList.add("active");
  } else if (viewMode === "result") {
    document.getElementById("result-container").style.display = "block";
    document.getElementById("btn-result").classList.add("active");
  } else if (viewMode === "side-by-side") {
    document.getElementById("side-by-side-container").style.display = "block";
    document.getElementById("btn-side-by-side").classList.add("active");
  }
}

// 뷰 전환 버튼 이벤트 리스너 추가
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("btn-original")
    .addEventListener("click", () => showView("original"));
  document
    .getElementById("btn-result")
    .addEventListener("click", () => showView("result"));
  document
    .getElementById("btn-side-by-side")
    .addEventListener("click", () => showView("side-by-side"));
});

// 캡처 버튼 이벤트 리스너
document.getElementById("capture-btn").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");
  resultDiv.innerText = "화면 캡처 중...";

  chrome.tabs.captureVisibleTab(null, { format: "png" }, async (dataUrl) => {
    try {
      const numbers = await processImage(dataUrl);

      resultDiv.innerText = "숫자 조합 분석 중...";
      const combos = findCombinations(numbers);

      // content.js에 강조 요청 메시지 전송 (예외처리 추가)
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        // chrome://, 확장관리, 새탭 등에서는 안내
        if (
          !tab ||
          !tab.url ||
          tab.url.startsWith("chrome://") ||
          tab.url.startsWith("chrome-extension://") ||
          tab.url === "about:blank"
        ) {
          alert("이 확장 기능은 일반 웹페이지에서만 사용할 수 있습니다.");
          return;
        }
        chrome.tabs.sendMessage(
          tab.id,
          { type: "highlight", combos },
          (response) => {
            if (chrome.runtime.lastError) {
              alert("이 페이지에서는 강조 기능을 사용할 수 없습니다.");
            }
          }
        );
      });

      resultDiv.innerText =
        combos.length > 0
          ? `강조 완료! (조합 ${combos.length}개)`
          : "합이 10인 인접 조합이 없습니다.";
    } catch (e) {
      console.error("이미지 처리 오류:", e);
      resultDiv.innerText = "이미지 처리 실패: " + e.message;
    }
  });
});

// 3x5 grid를 이미지로 만들어 콘솔에 표시하는 함수 (색상 진함만 강조, 텍스트 제거)
function logGridAsImage(grid, label = "Grid") {
  const cellW = 20,
    cellH = 20;
  const w = 3 * cellW,
    h = 5 * cellH;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const v = grid[row][col];
      // 값이 높을수록 진한 파랑, 0이면 흰색
      ctx.fillStyle = `rgb(${255 - v * 255},${255 - v * 255},255)`;
      ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
      ctx.strokeStyle = "#888";
      ctx.strokeRect(col * cellW, row * cellH, cellW, cellH);
      // 텍스트는 제거 (색상만으로 진함 표현)
    }
  }
  // 콘솔에 이미지로 출력
  console.log(`${label}:`, canvas.toDataURL());
}

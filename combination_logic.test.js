// combination_logic.test.js

// isAdjacent and findCombinations are loaded globally via jest.config.js setupFilesAfterEnv

// Helper to create a mock number object
const N = (id, value, x, y, originalIndex) => ({
  id, // For easier identification in tests
  value,
  bbox: { x0: x, y0: y, x1: x + 10, y1: y + 10 }, // Assuming 10x10 box
  originalIndex: originalIndex === undefined ? id : originalIndex, // Default originalIndex to id if not provided
});

// Helper to sort combinations for deterministic comparison
// Each combo is an array of number objects. Sort by originalIndex.
// Then sort the array of combos by the originalIndex of their first number.
const sortCombinations = (combos) => {
  return combos.map(combo => [...combo].sort((a, b) => a.originalIndex - b.originalIndex))
               .sort((comboA, comboB) => {
                 if (comboA.length === 0 && comboB.length === 0) return 0;
                 if (comboA.length === 0) return -1;
                 if (comboB.length === 0) return 1;
                 return comboA[0].originalIndex - comboB[0].originalIndex;
               });
};


describe('isAdjacent', () => {
  test('should return true for adjacent numbers', () => {
    expect(isAdjacent(N(1, 5, 10, 10), N(2, 5, 20, 10))).toBe(true); // Horizontal adjacency
    expect(isAdjacent(N(1, 5, 10, 10), N(2, 5, 10, 20))).toBe(true); // Vertical adjacency
    expect(isAdjacent(N(1, 5, 10, 10), N(2, 5, 15, 15))).toBe(true); // Diagonal, within threshold
  });

  test('should return false for non-adjacent numbers', () => {
    expect(isAdjacent(N(1, 5, 10, 10), N(2, 5, 100, 100))).toBe(false);
  });

  test('should handle edge cases around the threshold', () => {
    // Assuming threshold = 60
    // Center of N1 is (15,15)
    // N_close: center (74,15). Euclidean distance = 59. Should be true.
    expect(isAdjacent(N(1,5,10,10), N(2,5,69,10))).toBe(true);
    // N_far: center (76,15). Euclidean distance = 61. Should be false by Euclidean, possibly true by Manhattan
    // Manhattan: |15-76| + |15-15| = 61. threshold*1.5 = 90. So true.
    expect(isAdjacent(N(1,5,10,10), N(2,5,71,10))).toBe(true); // dist 61, but Manhattan makes it true
    
    // Forcing it to be false (far enough for both)
    expect(isAdjacent(N(1,5,10,10), N(2,5,10, 105))).toBe(false); // dist 90, Manhattan 90. threshold*1.5 = 90. False because < threshold or < threshold*1.5
  });
});

describe('findCombinations', () => {
  test('i. Empty Input: findCombinations([]) should return []', () => {
    expect(findCombinations([])).toEqual([]);
  });

  test('ii. No Combinations: Numbers that do not sum to 10 or are not adjacent', () => {
    const numbers = [N(0,1,0,0), N(1,2,100,100), N(2,3,200,200)]; // Not adjacent, no sum 10
    expect(findCombinations(numbers)).toEqual([]);
    const numbers2 = [N(0,5,0,0), N(1,6,10,0)]; // Adjacent, sum 11
    expect(findCombinations(numbers2)).toEqual([]);
  });

  test('iii. Simple Pair: Two adjacent numbers summing to 10', () => {
    const n0 = N(0,5,0,0);
    const n1 = N(1,5,10,0);
    const numbers = [n0, n1];
    const expected = [[n0, n1]];
    expect(sortCombinations(findCombinations(numbers))).toEqual(sortCombinations(expected));
  });

  test('iv. Multiple Disjoint Pairs', () => {
    const n0 = N(0,5,0,0);
    const n1 = N(1,5,10,0); // Pair 1
    const n2 = N(2,3,100,100);
    const n3 = N(3,7,110,100); // Pair 2
    const numbers = [n0, n1, n2, n3];
    const expected = [[n0, n1], [n2, n3]];
    expect(sortCombinations(findCombinations(numbers))).toEqual(sortCombinations(expected));
  });
  
  test('v. Three-Number Combination', () => {
    const n0 = N(0,2,0,0);
    const n1 = N(1,3,10,0);
    const n2 = N(2,5,20,0);
    const numbers = [n0, n1, n2]; // A, B, C chain adjacent
    const expected = [[n0, n1, n2]];
    expect(sortCombinations(findCombinations(numbers))).toEqual(sortCombinations(expected));
  });

  test('vi. Combination and a Pair', () => {
    const n0 = N(0,1,0,0);
    const n1 = N(1,2,10,0);
    const n2 = N(2,7,20,0); // Combo A,B,C
    const n3 = N(3,4,100,0);
    const n4 = N(4,6,110,0); // Pair D,E
    const numbers = [n0, n1, n2, n3, n4];
    const expected = [[n0, n1, n2], [n3, n4]];
    expect(sortCombinations(findCombinations(numbers))).toEqual(sortCombinations(expected));
  });

  test('vii. Overlapping Potential (ensure no duplicates and correct grouping)', () => {
    // A(2,0,0, oi:0), B(3,10,0, oi:1), C(5,20,0, oi:2), D(5,30,0, oi:3)
    // A,B,C are chain adjacent (sum 10).
    // C,D are adjacent (sum 10).
    // B,C,D is sum 13.
    // Expected: [[A,B,C], [C,D]] (sorted by originalIndex)
    const nA = N(0,2,0,0,0);
    const nB = N(1,3,10,0,1);
    const nC = N(2,5,20,0,2);
    const nD = N(3,5,30,0,3);
    const numbers = [nA, nB, nC, nD];
    const expected = [ // A(0,0), B(10,0), C(20,0), D(30,0)
      [nA, nB, nC], // 2+3+5=10. A-B, B-C chain.
      [nA, nB, nD], // 2+3+5=10. A-B, B-D chain (B-D dist 20, adj).
      [nC, nD]      // 5+5=10. C-D chain.
    ];
    const result = findCombinations(numbers);
    expect(sortCombinations(result)).toEqual(sortCombinations(expected));
  });
  
  test('viii. Non-Adjacent Sum: Numbers sum to 10 but are not adjacent', () => {
    const n0 = N(0,5,0,0);
    const n1 = N(1,5,100,0); // Sum 10, but not adjacent
    const numbers = [n0, n1];
    expect(findCombinations(numbers)).toEqual([]);
  });

  test('ix. More complex adjacency for three numbers where only ends are not directly adjacent', () => {
    // A(2) -- B(3) -- C(5)
    // A is adjacent to B, B is adjacent to C. A is NOT adjacent to C.
    // This should still form combo [A,B,C]
    const nA = N(0,2,0,0,0);   // At (0,0)
    const nB = N(1,3,10,0,1);  // At (10,0) - adjacent to A
    const nC = N(2,5,20,0,2);  // At (20,0) - adjacent to B, but not A if threshold is small enough for direct A-C
                               // Default threshold is 60. A-C distance is 20. So they would be adjacent.
                               // Let's make A-C non-adjacent for a better test.
                               // A (0,0), B (10,0), C (70,0). A-C dist is 70.
    const nA_mod = N(0,2,0,0,0);
    const nB_mod = N(1,3,10,0,1);
    const nC_mod = N(2,5,70,0,2); // nC_mod is adjacent to nB_mod, but not nA_mod
    const numbers = [nA_mod, nB_mod, nC_mod];
    const expected = [[nA_mod, nB_mod, nC_mod]];
    expect(sortCombinations(findCombinations(numbers))).toEqual(sortCombinations(expected));
  });

  test('x. Numbers that could form multiple paths to sum 10, ensure all valid unique combos are found', () => {
    // A(1, oi:0, (0,0)) --- B(2, oi:1, (10,0)) --- C(7, oi:2, (20,0)) => [A,B,C]
    // D(8, oi:3, (0,10)) -- E(2, oi:4, (10,10)) => [D,E]
    // A is also adjacent to D. B is also adjacent to E.
    // A(1) + D(8) + E(2) is not a direct chain sum of 10.
    // A(1) + B(2) + E(2) ... no, not how it works.
    // The DFS builds on current path.
    const nA = N(0,1,0,0,0); // (0,0)
    const nB = N(1,2,10,0,1); // (10,0)
    const nC = N(2,7,20,0,2); // (20,0)
    const nD = N(3,8,0,10,3); // (0,10)
    const nE = N(4,2,10,10,4); // (10,10)

    // Adjacency checks based on centers (bbox is 10x10, so center is x+5, y+5):
    // A(5,5), B(15,5), C(25,5), D(5,15), E(15,15)
    // A-B: dist 10 (adj)
    // B-C: dist 10 (adj)
    // D-E: dist 10 (adj)
    // A-C: dist 20 (adj)
    // C-E: dist sqrt((25-15)^2 + (5-15)^2) = sqrt(100+100) = 14.1 (adj)
    // B-D: dist sqrt((15-5)^2 + (5-15)^2) = sqrt(100+100) = 14.1 (adj)
    // A-D: dist 10 (adj)
    // B-E: dist 10 (adj)
    // A-E: dist sqrt((5-15)^2 + (5-15)^2) = 14.1 (adj)

    const numbers = [nA, nB, nC, nD, nE];
    const expected = [
      [nA, nB, nC], // 1+2+7=10. Path: A-B-C
      [nD, nE],     // 8+2=10. Path: D-E
      [nA, nC, nE], // 1+7+2=10. Path: A-C-E (A-C adj, C-E adj)
      [nB, nD],     // 2+8=10. Path: B-D (B-D adj, direct pair)
      // Other potential valid paths if logic allows branching from any node in path:
      // e.g. A-E-D (1-2-8) = 11, A-D-E (1-8-2) = 11
      // The DFS ensures extension from the *lastAddedNode*.
      // Consider A(1)-D(8) -> sum 9. Next: E(2). E adj to D. Path [A,D,E]. Sum 11.
      // Consider A(1)-E(2) -> sum 3. Next: C(7). C adj to E. Path [A,E,C]. Sum 10. Sig(0,4,2) -> (0,2,4) -> [nA,nC,nE]. Already found.
      // Consider B(2)-E(2) -> sum 4. Next: C(7). C adj to E. Path [B,E,C]. Sum 11.
    ];

    const result = findCombinations(numbers);
    expect(sortCombinations(result)).toEqual(sortCombinations(expected));
  });

  test('xi. Combination with zero value numbers (if allowed, though problem implies positive numbers)', () => {
    // Assuming numbers are positive from apples. If 0 is allowed:
    // A(5,oi:0), B(5,oi:1), C(0,oi:2). A,B,C adjacent.
    // Result should be [[A,B], [A,B,C]] because length >=2 and sum = 10
    // Current logic: if sum is 10, it returns. It doesn't try to extend with 0.
    // This is consistent with "sum to 10".
    const nA = N(0,5,0,0,0);
    const nB = N(1,5,10,0,1);
    const nC = N(2,0,20,0,2); // Adjacent to nB
    const numbers = [nA, nB, nC];
    const expected = [[nA, nB]]; // Because [nA,nB,nC] also sums to 10.
                                // The DFS returns when sum is 10. So [A,B] is found.
                                // Then, if it tries to extend [A,B] with C, sum is still 10. Path [A,B,C].
                                // Yes, this should be found.

    // Let's trace:
    // dfs(A, [A], 5)
    //  dfs(B, [A,B], 10) -> finds [A,B], returns.
    // After B pops, loop continues in dfs(A, [A], 5).
    //  Is C adj to A? No (0,0 to 20,0, dist 20 - yes).
    //  dfs(C, [A,C], 5)
    //   Is B adj to C? Yes. Is B in path [A,C]? No.
    //   dfs(B, [A,C,B], 10) -> finds [A,C,B] (sorted: [A,B,C])
    //
    // dfs(B, [B], 5)
    //  dfs(A, [B,A], 10) -> finds [B,A] (sorted: [A,B]) - duplicate signature
    //  dfs(C, [B,C], 5)
    //   dfs(A, [B,C,A], 10) -> finds [B,C,A] (sorted: [A,B,C]) - duplicate signature
    //
    // dfs(C, [C], 0)
    //  dfs(A, [C,A], 5) ...
    //  dfs(B, [C,B], 5) ...
    // This means [A,B,C] should indeed be found if it's a valid path.
    const expectedWithZero = [
        [nA,nB],
        [nA,nB,nC] // if path A-B-C is valid. A(0,0), B(10,0), C(20,0) are all chain adj.
    ];
    expect(sortCombinations(findCombinations(numbers))).toEqual(sortCombinations(expectedWithZero));
  });

  test('xii. All numbers form one large combination', () => {
    const n0 = N(0,1,0,0);
    const n1 = N(1,1,10,0);
    const n2 = N(2,1,20,0);
    const n3 = N(3,1,30,0);
    const n4 = N(4,6,40,0);
    const numbers = [n0,n1,n2,n3,n4];
    const expected = [[n0,n1,n2,n3,n4]];
    expect(sortCombinations(findCombinations(numbers))).toEqual(sortCombinations(expected));
  });

  test('xiii. Ensure originalIndex is used for sorting, not id', () => {
    // Numbers are added to array in an order different from their intended originalIndex
    const nA = N(10, 5, 0,0, 1); // object's own originalIndex = 1
    const nB = N(0, 5, 10,0, 0); // object's own originalIndex = 0
    const numbers = [nA, nB]; // nA is at originalNumbers[0], nB is at originalNumbers[1]
    
    const expectedInnerSorted = [[nB, nA]]; // Sorted by object's own originalIndex property

    const rawResult = findCombinations(numbers); 
    const resultForCheck = sortCombinations(rawResult); // Sorts based on object's own originalIndex

    expect(resultForCheck).toEqual(sortCombinations(expectedInnerSorted));
    // Now check the content of the sorted result
    expect(resultForCheck[0][0].originalIndex).toBe(0); // nB.originalIndex
    expect(resultForCheck[0][1].originalIndex).toBe(1); // nA.originalIndex
  });
});

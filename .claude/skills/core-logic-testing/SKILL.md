---
name: core-logic-testing
description: Use when modifying core game logic, utility functions, or state management. Requires 100% test coverage for all non-UI code.
---

# Core Logic Testing

## Overview

**All core logic must have 100% test coverage.** This is non-negotiable.

**Core principle:** If you can't test it, you can't trust it. If you don't test it, you don't know it works.

**Violating the letter of the rules is violating the spirit of the rules.**

## When to Use

**Always:**
- Modifying any function in `src/utils/`
- Modifying any store in `src/stores/`
- Adding new game logic
- Fixing bugs in game logic
- Refactoring state management

**Exceptions (ask your human partner):**
- Pure UI changes (CSS, component styling)
- Configuration files
- Type definitions without logic

Thinking "skip tests just this once"? Stop. That's rationalization.

## The Iron Law

```
NO LOGIC CHANGES WITHOUT 100% COVERAGE
```

Modify logic without tests? Revert it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Revert means revert

## Coverage Requirements

### Required Coverage Metrics

```yaml
lines: 100%
functions: 100%
branches: 100%
statements: 100%
```

### What Must Be Tested

| Module | Examples |
|--------|----------|
| `src/utils/mahjong.ts` | All exported functions |
| `src/stores/gameStore.ts` | All actions, state transitions |
| New utility files | All public APIs |
| Bug fixes | Regression test + fix |

### What Is Exempt

- UI components (`src/components/`)
- CSS/styling
- Type definitions (`.d.ts`)
- Static configuration

## RED-GREEN-REFACTOR for Logic Changes

### RED: Write Failing Test

Before modifying any logic, write a test that will fail with the current code (for new features) or captures the bug (for fixes).

<Good>
```typescript
// Test for new feature: canAnGang detection
it('should return tile when having 4 same tiles', () => {
  const hand: Tile[] = [
    { id: '1', suit: 'tong', value: 5 },
    { id: '2', suit: 'tong', value: 5 },
    { id: '3', suit: 'tong', value: 5 },
    { id: '4', suit: 'tong', value: 5 },
  ];
  const result = canAnGang(hand);
  expect(result).not.toBeNull();
  expect(result?.suit).toBe('tong');
  expect(result?.value).toBe(5);
});
```
Clear name, tests real behavior, one thing
</Good>

<Bad>
```typescript
it('gang works', () => {
  const mockHand = createMockHand([5,5,5,5]);
  expect(canAnGang(mockHand)).toBeTruthy();
});
```
Vague name, uses mock instead of real data
</Bad>

**Requirements:**
- One behavior per test
- Clear, descriptive name
- Real data (no mocks unless unavoidable)
- Edge cases covered

### Verify RED

**MANDATORY. Never skip.**

```bash
npm test path/to/test.test.ts
```

Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing/bug present (not typos)

**Test passes?** You're testing existing behavior. Fix test.

**Test errors?** Fix error, re-run until it fails correctly.

### GREEN: Implement/Fix

Write minimal code to pass the test.

<Good>
```typescript
export function canAnGang(hand: Tile[]): Tile | null {
  const valueCount = new Map<string, number>();
  for (const tile of hand) {
    const key = `${tile.suit}-${tile.value}`;
    valueCount.set(key, (valueCount.get(key) || 0) + 1);
  }

  for (const [key, count] of valueCount.entries()) {
    if (count === 4) {
      const [suit, value] = key.split('-');
      return hand.find(t => t.suit === suit && t.value === parseInt(value))!;
    }
  }
  return null;
}
```
Just enough to pass
</Good>

<Bad>
```typescript
export function canAnGang(
  hand: Tile[],
  options?: {
    minCount?: number;
    onFound?: (tile: Tile) => void;
  }
): Tile | null {
  // YAGNI - over-engineered
}
```
Over-engineered for current needs
</Bad>

Don't add features beyond the test. Don't refactor other code.

### Verify GREEN

**MANDATORY.**

```bash
npm test
```

Confirm:
- New test passes
- All existing tests still pass
- Coverage at 100%

**Test fails?** Fix code, not test.

**Other tests fail?** Fix now.

**Coverage < 100%?** Add more tests.

### REFACTOR: Clean Up

After green only:
- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

### Repeat

Next failing test for next feature.

## Running Tests

### Single File
```bash
npm test -- src/utils/__tests__/mahjong.test.ts
```

### All Tests
```bash
npm test
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode (Development)
```bash
npm test -- --watch
```

## Coverage Report

After running `npm run test:coverage`, check the report:

```
Coverage summary
Statements   : 100% ( 50/50 )
Branches     : 100% ( 20/20 )
Functions    : 100% ( 10/10 )
Lines        : 100% ( 48/48 )
```

**All metrics must show 100%.** No exceptions.

## Test Structure

### File Organization
```
src/
  utils/
    mahjong.ts
    __tests__/
      mahjong.test.ts
  stores/
    gameStore.ts
    __tests__/
      gameStore.test.ts
```

### Test Naming
```typescript
describe('functionName', () => {
  it('should [expected behavior] when [condition]', () => {
    // test
  });

  it('should return [value] for [input]', () => {
    // test
  });

  it('should handle [edge case]', () => {
    // test
  });
});
```

### Required Test Cases

For every function, test:
1. **Happy path** - normal input
2. **Edge cases** - empty arrays, single items, boundaries
3. **Error cases** - invalid inputs (if applicable)
4. **Branch coverage** - every if/else branch

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "It's a simple change" | Simple changes break. Test takes 2 minutes. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "I manually tested it" | Manual testing doesn't cover edge cases. Can't re-run. |
| "The existing tests cover it" | Existing tests don't cover new behavior. |
| "100% is too strict" | Untested code has bugs. Period. |
| "This is different because..." | No it's not. Test it. |

## Red Flags - STOP and Test

- Modifying logic without failing test first
- Thinking "existing tests are enough"
- Planning to "add tests later"
- Coverage report shows < 100%
- "I'll just run it manually"
- "This change is too small to test"

**All of these mean: Stop. Write test first. Follow RED-GREEN-REFACTOR.**

## Verification Checklist

Before marking logic changes complete:

- [ ] Every new/modified function has tests
- [ ] Watched each new test fail before implementing
- [ ] Each test failed for expected reason
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Coverage report shows 100% for all metrics
- [ ] Edge cases and error cases covered
- [ ] No test mocks unless unavoidable

Can't check all boxes? You skipped testing. Start over.

## Example: Bug Fix Workflow

**Bug:** `canHu` returns true for hands without que yi men

**RED**
```typescript
it('should return false when not que yi men', () => {
  const hand: Tile[] = [
    { id: '1', suit: 'tong', value: 1 },
    { id: '2', suit: 'tiao', value: 1 },
    { id: '3', suit: 'wan', value: 1 },
  ];
  const discard: Tile = { id: '4', suit: 'tong', value: 2 };
  expect(canHu(hand, discard)).toBe(false);
});
```

**Verify RED**
```bash
$ npm test
FAIL: expected false, got true
```

**GREEN**
```typescript
export function canHu(hand: Tile[], discard?: Tile): boolean {
  const allTiles = [...hand];
  if (discard) allTiles.push(discard);

  // Check que yi men
  const suits = new Set(allTiles.map(t => t.suit));
  if (suits.size > 2) return false;

  return checkWinPattern(allTiles);
}
```

**Verify GREEN**
```bash
$ npm test
PASS
Coverage: 100%
```

**REFACTOR**
Extract que yi men check if duplicated elsewhere.

## Final Rule

```
Logic change → test exists, failed first, now passes at 100% coverage
Otherwise → not complete
```

No exceptions without your human partner's permission.

# Zero Belial Image Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder images for Zero and Belial with the real images from `pic_src` without changing Tiga or Decker.

**Architecture:** Keep the existing avatar rendering path unchanged and only attach explicit asset URLs to the two affected hero profiles. Copy the source images into Vite public assets so the runtime serves them directly.

**Tech Stack:** React, TypeScript, Vite, Vitest

---

### Task 1: Lock the expected hero asset paths with tests

**Files:**
- Create: `apps/web/src/theme/ultraman/__tests__/heroes.test.ts`
- Modify: none
- Test: `apps/web/src/theme/ultraman/__tests__/heroes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { getHero } from '../heroes';

describe('hero image overrides', () => {
  it('uses the copied real image for zero', () => {
    expect(getHero('zero').imageUrl).toBe('/assets/heroes/zero.jpg');
  });

  it('uses the copied real image for belial', () => {
    expect(getHero('belial').imageUrl).toBe('/assets/heroes/belial.jpeg');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ultraman/web exec vitest run src/theme/ultraman/__tests__/heroes.test.ts`
Expected: FAIL because `imageUrl` is currently `undefined`

- [ ] **Step 3: Write minimal implementation**

```ts
{ id: 'zero', name: '赛罗', color: '#2979ff', accent: '#ff1744', tagline: '赛罗战士', imageUrl: '/assets/heroes/zero.jpg' },
{ id: 'belial', name: '贝利亚', color: '#d500f9', accent: '#ff9100', tagline: '暗之皇帝', imageUrl: '/assets/heroes/belial.jpeg' },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ultraman/web exec vitest run src/theme/ultraman/__tests__/heroes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/theme/ultraman/__tests__/heroes.test.ts apps/web/src/theme/ultraman/heroes.ts
git commit -m "fix: point zero and belial to real images"
```

### Task 2: Copy the approved source images into public assets

**Files:**
- Create: `apps/web/public/assets/heroes/zero.jpg`
- Create: `apps/web/public/assets/heroes/belial.jpeg`
- Modify: none
- Test: `apps/web/src/theme/ultraman/__tests__/heroes.test.ts`

- [ ] **Step 1: Copy the exact source files**

```bash
cp pic_src/赛罗.jpg apps/web/public/assets/heroes/zero.jpg
cp pic_src/贝利亚.jpeg apps/web/public/assets/heroes/belial.jpeg
```

- [ ] **Step 2: Run the focused web tests**

Run: `pnpm --filter @ultraman/web exec vitest run src/theme/ultraman/__tests__/heroes.test.ts src/theme/__tests__/assetResolver.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/public/assets/heroes/zero.jpg apps/web/public/assets/heroes/belial.jpeg
git commit -m "chore: add zero and belial hero images"
```

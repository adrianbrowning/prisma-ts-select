# 🧪 Testing & Infrastructure

## Testing

### #15 - Add tests for having must be after groupBy
**Goal:** Ensure `.having()` can only be called after `.groupBy()` and test this enforcement.

**Sub-tasks:**
- [ ] Review current type system enforcement (should already prevent this)
- [ ] Add TypeScript test cases that should fail to compile
- [ ] Add runtime test verifying error when `.having()` called without `.groupBy()`
- [ ] Document the ordering requirement in README.md

---

### #13 - Tests, type check object, union of types
**Goal:** Unclear - needs investigation and clarification.

**Sub-tasks:**
- [ ] Review issue #13 on GitHub for details
- [ ] Determine what type checking is needed
- [ ] Break down into specific test cases

---

## CI/CD & Code Quality

### #18 - CI: Husky, ESLint, StyleLint, knip.dev
**Goal:** Improve CI/CD tooling and code quality checks.

**Sub-tasks:**
- [ ] Already has Husky - verify it's working correctly
- [ ] Already has ESLint - review and update rules if needed
- [ ] Add StyleLint for CSS/SCSS (if applicable, might not be needed)
- [ ] Already has knip configured - ensure it runs in CI
- [ ] Add lint check to GitHub Actions workflow
- [ ] Add knip check to GitHub Actions workflow
- [ ] Configure pre-commit hooks for auto-formatting
- [ ] Document linting setup in README.md

**Status:** Partially completed - Husky, ESLint, knip already configured.

---

## Publishing

### #20 - Set up publish to npm/jsr
**Goal:** Automate publishing to npm and JSR (JavaScript Registry).

**Sub-tasks:**
- [ ] Review existing semantic-release configuration in package.json
- [ ] Configure npm publishing automation (may already be configured but commented out)
- [ ] Research JSR publishing requirements
- [ ] Add JSR publishing to release workflow
- [ ] Configure release branches (currently only 'main')
- [ ] Test release process on a test version
- [ ] Document release process in CONTRIBUTING.md

**Status:** Semantic release is configured but publish job is commented out in CI.yml.

---

### #21 - Change Sets
**Goal:** Unclear - possibly relates to tracking changes or migrations.

**Sub-tasks:**
- [ ] Review issue #21 on GitHub for context
- [ ] Determine what change set functionality is needed
- [ ] Break down into implementation tasks

---

### #22 - Review repo for ideas
**Goal:** Review another repository for feature ideas or implementation patterns.

**Sub-tasks:**
- [ ] Identify the repository to review
- [ ] List relevant features or patterns to adopt
- [ ] Create follow-up tasks for valuable ideas

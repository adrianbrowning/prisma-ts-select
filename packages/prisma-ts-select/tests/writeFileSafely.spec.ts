import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test, afterEach } from "node:test";
import { writeFileSafely } from "../src/utils/writeFileSafely.ts";

const tmpDir = path.join(import.meta.dirname!, ".tmp-writeFileSafely");

void afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

void describe("writeFileSafely", () => {
  void test("writes file content", () => {
    const target = path.join(tmpDir, "test.txt");
    writeFileSafely(target, "hello");
    assert.equal(fs.readFileSync(target, "utf-8"), "hello");
  });

  void test("creates nested directories", () => {
    const target = path.join(tmpDir, "a", "b", "c", "deep.txt");
    writeFileSafely(target, "deep");
    assert.equal(fs.readFileSync(target, "utf-8"), "deep");
  });

  void test("overwrites existing file", () => {
    const target = path.join(tmpDir, "overwrite.txt");
    writeFileSafely(target, "first");
    writeFileSafely(target, "second");
    assert.equal(fs.readFileSync(target, "utf-8"), "second");
  });
});

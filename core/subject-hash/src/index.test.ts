import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSubjectHash } from "./index.js";

describe("getSubjectHash", () => {
  // Values from readme.md — keep in sync
  const subject = "email:user@example.com";
  const expectedBase64url = "tmwIJmeStJDSo9giG47rcw";
  const expectedHex = "b66c08266792b490d2a3d8221b8eeb73";
  const expectedBigint = 242480428595577766886520952605903874931n;

  it("base64url matches readme example", () => {
    assert.equal(getSubjectHash(subject), expectedBase64url);
  });

  it("hex matches readme example", () => {
    assert.equal(getSubjectHash(subject, "hex"), expectedHex);
  });

  it("bigint matches readme example", () => {
    assert.equal(getSubjectHash(subject, "bigint"), expectedBigint);
  });

  it("base64url output is 22 characters", () => {
    assert.equal(getSubjectHash(subject).length, 22);
  });

  it("hex output is 32 characters", () => {
    assert.equal(getSubjectHash(subject, "hex").length, 32);
  });
});

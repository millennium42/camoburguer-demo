import assert from "node:assert/strict";
import test from "node:test";
import { createUserSchema, updateUserSchema } from "../apps/api/src/user-schema.js";

test("createUserSchema validates correctly", () => {
  const valid = {
    name: "Test User",
    email: "test@camoburguer.local",
    username: "testuser",
    role: "operator",
    password: "securepassword123",
  };
  assert.equal(createUserSchema.validate(valid).error, undefined);

  const invalid = { ...valid, password: "short" };
  assert.ok(createUserSchema.validate(invalid).error);
});

test("updateUserSchema validates correctly", () => {
  const valid = { name: "New Name" };
  assert.equal(updateUserSchema.validate(valid).error, undefined);

  const invalid = { password: "short" };
  assert.ok(updateUserSchema.validate(invalid).error);
});

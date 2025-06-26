// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest"
import { decodeBase64ToString, encodeStringToBase64 } from "../src"

describe("ZappyBase64", () => {
  describe("Base64 encoding", () => {
    it("base64 encode/decode", () => {
      const original = "hello"
      const encoded = encodeStringToBase64(original)
      expect(encoded).not.toBe(original)
      const decoded = decodeBase64ToString(encoded)
      expect(decoded).toBe(original)
    })

    it("base64 proper encode check", () => {
      const encoded = encodeStringToBase64("hello")
      expect(encoded).toBe("aGVsbG8")
    })

    it("base64 malformed check", () => {
      expect(() => {
        decodeBase64ToString("aGVsb@8") // Wrong character.
      }).toThrow()
      expect(() => {
        decodeBase64ToString("aGVsbG8c1") // Wrong length.
      }).toThrow()
    })
  })
})

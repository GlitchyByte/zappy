// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { numberToHexBytes, numberToHexString } from "../main/gutils"

describe("gutils", () => {
  describe("hex", () => {
    test("hex string uppercase", () => {
      const value = 0x1467cafe
      const str = numberToHexString(value, true)
      expect(str).toBe("1467CAFE")
    })

    test("hex string lowercase", () => {
      const value = 0x1467cafe
      const str = numberToHexString(value, false)
      expect(str).toBe("1467cafe")
    })

    test("hex bytes uppercase", () => {
      const value = 0x1467cafe
      const bytes = numberToHexBytes(value, true)
      expect(bytes.getUInt8(0)).toBe(0x31)
      expect(bytes.getUInt8(5)).toBe(0x41)
    })

    test("hex bytes lowercase", () => {
      const value = 0x1467cafe
      const bytes = numberToHexBytes(value, false)
      expect(bytes.getUInt8(0)).toBe(0x31)
      expect(bytes.getUInt8(5)).toBe(0x61)
    })
  })
})

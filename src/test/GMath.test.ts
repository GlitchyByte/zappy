// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { GMath } from "../main/GMath"

describe("GMath", () => {
  describe("min", () => {
    test("v1 < v2", () => {
      const v1 = 77
      const v2 = 888
      const result = GMath.min(v1, v2)
      expect(result).toBe(77)
    })

    test("v1 > v2", () => {
      const v1 = 888
      const v2 = 77
      const result = GMath.min(v1, v2)
      expect(result).toBe(77)
    })

    test("v1 == v2", () => {
      const v1 = 77
      const v2 = 77
      const result = GMath.min(v1, v2)
      expect(result).toBe(77)
    })
  })

  describe("max", () => {
    test("v1 < v2", () => {
      const v1 = 77
      const v2 = 888
      const result = GMath.max(v1, v2)
      expect(result).toBe(888)
    })

    test("v1 > v2", () => {
      const v1 = 888
      const v2 = 77
      const result = GMath.max(v1, v2)
      expect(result).toBe(888)
    })

    test("v1 == v2", () => {
      const v1 = 77
      const v2 = 77
      const result = GMath.max(v1, v2)
      expect(result).toBe(77)
    })
  })
})

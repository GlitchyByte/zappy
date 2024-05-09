// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { Twaddle } from "../src/Twaddle"

test("default contraction empty message", () => {
  const twaddle = new Twaddle(null)
  const encoded = twaddle.encode("")
  expect(encoded).toBe("")
})

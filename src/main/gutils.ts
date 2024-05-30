// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

// Common utils.

import { GByteBuffer } from "./GByteBuffer"

/**
 * Converts number value into a hex string.
 *
 * @param value Value to convert.
 * @param uppercase Flag to make the resulting hex characters uppercase.
 * @return A hex string.
 */
export const numberToHexString = (value: number, uppercase = false): string => {
  if (value === 0) {
    return "0"
  }
  let str = ""
  const hexDigits = uppercase ? "0123456789ABCDEF" : "0123456789abcdef"
  while (value !== 0) {
    const digit = value & 0x0f
    str = hexDigits[digit] + str
    value >>= 4
  }
  return str
}

/**
 * Converts number value into a byte representation of the hex string.
 *
 * @param value Value to convert.
 * @param uppercase Flag to make the resulting hex characters uppercase.
 * @return A byte buffer with the representation of the hex string.
 */
export const numberToHexBytes = (value: number, uppercase = false): GByteBuffer => {
  const buffer = GByteBuffer.create(8)
  if (value === 0) {
    buffer.appendUInt8(0x30)
    return buffer
  }
  while (value !== 0) {
    const digit = value & 0x0f
    let hexChar: number
    if (digit <= 9) {
      hexChar = 0x30 + digit
    } else if (uppercase) {
      hexChar = 0x37 + digit
    } else {
      hexChar = 0x57 + digit
    }
    buffer.insert(0, hexChar)
    value >>= 4
  }
  return buffer
}

// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { bytesToString, GByteBufferWriter, GMath } from "@glitchybyte/dash"

function base64CharacterTo6Bits(ch: string): number {
  const chByte = ch.charCodeAt(0)
  if ((chByte >= 65) && (chByte <= 90)) { // A-Z
    return chByte - 65
  }
  if ((chByte >= 97) && (chByte <= 122)) { // a-z
    return chByte - 71
  }
  if ((chByte >= 48) && (chByte <= 57)) { // 0-9
    return chByte + 4
  }
  if (chByte === 45) { // -
    return 62
  }
  if (chByte === 95) { // _
    return 63
  }
  throw new Error("Invalid base64 character!")
}

/**
 * Decodes a base64 string into raw bytes.
 *
 * Expects encoding with "-" and "_", and no padding.
 *
 * @param str Base64 string.
 * @throws Error If str is an invalid base64 string.
 */
export function decodeBase64ToBytes(str: string): Uint8Array {
  // Base64 decode.
  // We have 4 6-bit bytes. Make 3 bytes out of them.
  const strLength = str.length
  const bytes = new GByteBufferWriter()
  if ((strLength & 3) === 1) {
    throw new Error("Illegal number of bytes!")
  }
  let start = 0
  while (start < strLength) {
    const count = GMath.min(4, strLength - start)
    const b0 = base64CharacterTo6Bits(str[start])
    const b1 = base64CharacterTo6Bits(str[start + 1])
    const d0 = (b0 << 2) | (b1 >> 4)
    bytes.writeUInt8(d0)
    if (count === 4) {
      const b2 = base64CharacterTo6Bits(str[start + 2])
      const d1 = ((b1 & 0x0f) << 4) | (b2 >> 2)
      const b3 = base64CharacterTo6Bits(str[start + 3])
      const d2 = ((b2 & 0x03) << 6) | b3
      const word = (d2 << 8) | d1
      bytes.writeUInt16(word)
    } else if (count === 3) {
      const b2 = base64CharacterTo6Bits(str[start + 2])
      const d1 = ((b1 & 0x0f) << 4) | (b2 >> 2)
      bytes.writeUInt8(d1)
    }
    start += count
  }
  return bytes.extractBytes()
}

/**
 * Decodes a base64 string into an utf-8 string.
 *
 * Expects encoding with "-" and "_", and no padding.
 *
 * @param str Base64 string.
 * @throws Error If str is an invalid base64 string.
 */
export function decodeBase64ToString(str: string): string {
  const bytes = decodeBase64ToBytes(str)
  return bytesToString(bytes)
}

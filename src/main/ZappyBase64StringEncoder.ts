// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { GMath } from "./GMath"

/**
 * Base64 string encoder.
 *
 * <p>Alphabet includes '-' and '_'. Does not produce padding characters.
 */
export class ZappyBase64StringEncoder {

  private static readonly base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

  protected readonly textEncoder = new TextEncoder()

  protected bytesToBase64Alphabet(bytes: Uint8Array): string {
    // Base64 encode.
    // We have 3 bytes. Make 4 6-bit bytes out of them.
    const bytesLength = bytes.length
    const base64Alphabet = ZappyBase64StringEncoder.base64Alphabet
    let str = ""
    let start = 0
    while (start < bytesLength) {
      const count = GMath.min(3, bytesLength - start)
      const b0 = bytes[start]
      const e0 = b0 >> 2
      str += base64Alphabet[e0]
      if (count === 3) {
        const b1 = bytes[start + 1]
        const b2 = bytes[start + 2]
        const e1 = ((b0 & 0x03) << 4) | (b1 >> 4)
        str += base64Alphabet[e1]
        const e2 = ((b1 & 0x0f) << 2) | (b2 >> 6)
        str += base64Alphabet[e2]
        const e3 = b2 & 0x3f
        str += base64Alphabet[e3]
      } else if (count === 2) {
        const b1 = bytes[start + 1]
        const e1 = ((b0 & 0x03) << 4) | (b1 >> 4)
        str += base64Alphabet[e1]
        const e2 = (b1 & 0x0f) << 2
        str += base64Alphabet[e2]
      } else {
        const e1 = (b0 & 0x03) << 4
        str += base64Alphabet[e1]
      }
      start += count
    }
    return str
  }

  /**
   * Encodes a string into a base64 string.
   *
   * <p>Encodes with "-" and "_", and no padding.
   *
   * @param str Original string to encode.
   * @return A base64 string.
   */
  public base64StringEncode(str: string): string {
    const bytes = this.textEncoder.encode(str)
    return this.bytesToBase64Alphabet(bytes)
  }
}

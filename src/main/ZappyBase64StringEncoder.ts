// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { StringGenerator, BytesGenerator, ZappyCommonBase } from "./ZappyCommonBase"

export class ZappyBase64StringEncoder extends ZappyCommonBase {

  /**
   * Base64 alphabet.
   */
  private static readonly base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

  /**
   * Creates a Zappy base64 string encoder.
   */
  public constructor() {
    super()
  }

  protected *bytesToBase64Bytes(gen: BytesGenerator): BytesGenerator {
    const buffer = new Uint8Array(3)
    let bufferUsed = 0
    const outputBytes = new Uint8Array(4)
    const base64Encode = () => {
      // Base64 encode.
      // We have 3 bytes. Make 4 6-bit bytes out of them.
      const encoded = bufferUsed === 3 ? outputBytes : new Uint8Array(bufferUsed + 1)
      const b0 = buffer[0]
      const b1 = bufferUsed > 1 ? buffer[1] : 0
      const b2 = bufferUsed > 2 ? buffer[2] : 0
      encoded[0] = (b0 >> 2) & 0x3f
      encoded[1] = ((b0 & 0x03) << 4) | ((b1 & 0xf0) >> 4)
      if (bufferUsed > 1) {
        encoded[2] = ((b1 & 0x0f) << 2) | ((b2 & 0xc0) >> 6)
        if (bufferUsed > 2) {
          encoded[3] = b2 & 0x3f
        }
      }
      return encoded
    }
    for (const bytes of gen) {
      for (const byte of bytes) {
        buffer[bufferUsed++] = byte
        if (bufferUsed === 3) {
          const encoded = base64Encode()
          bufferUsed = 0
          yield encoded
        }
      }
    }
    if (bufferUsed === 0) {
      return
    }
    const encoded = base64Encode()
    bufferUsed = 0
    yield encoded
  }

  protected *base64BytesToBase64Alphabet(gen: BytesGenerator): StringGenerator {
    for (const bytes of gen) {
      for (const byte of bytes) {
        yield ZappyBase64StringEncoder.base64Alphabet[byte]
      }
    }
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
    return this.stringCollector(this.base64BytesToBase64Alphabet(this.bytesToBase64Bytes(this.stringToUtf8Bytes(str))))
  }
}

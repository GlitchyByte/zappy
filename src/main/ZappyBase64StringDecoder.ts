// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { GByteBuffer } from "./GByteBuffer"
import { GMath } from "./GMath"

/**
 * Base64 string decoder.
 */
export class ZappyBase64StringDecoder {

  public readonly throwOnDecodeErrors: boolean
  protected readonly textEncoder = new TextEncoder()
  protected readonly textDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
  private readonly base64Buffer = GByteBuffer.create()

  /**
   * Creates a Zappy base64 decoder.
   *
   * @param throwOnDecodeErrors Flag to indicate if the object should throw exceptions when
   *          it finds errors during decoding. If false, decoding errors will simply produce
   *          a null output.
   */
  public constructor(throwOnDecodeErrors: boolean) {
    this.throwOnDecodeErrors = throwOnDecodeErrors
  }

  private base64ToByte(ch: string): number {
    const chByte = ch.charCodeAt(0)
    if ((chByte >= 65) && (chByte <=90)) {
      return chByte - 65
    }
    if ((chByte >= 97) && (chByte <=122)) {
      return chByte - 71
    }
    if ((chByte >= 48) && (chByte <=57)) {
      return chByte + 4
    }
    if (chByte === 45) {
      return 62
    }
    if (chByte === 95) {
      return 63
    }
    throw new Error("Invalid base64 character!")
  }

  protected base64AlphabetToBytes(str: string): Uint8Array {
    // Base64 decode.
    // We have 4 6-bit bytes. Make 3 bytes out of them.
    const strLength = str.length
    const bytes = this.base64Buffer
    bytes.reset()
    if ((strLength & 3) === 1) {
      throw new Error("Illegal number of bytes!")
    }
    let start = 0
    while (start < strLength) {
      const count = GMath.min(4, strLength - start)
      const b0 = this.base64ToByte(str[start])
      const b1 = this.base64ToByte(str[start + 1])
      const d0 = (b0 << 2) | (b1 >> 4)
      bytes.appendUInt8(d0)
      if (count === 4) {
        const b2 = this.base64ToByte(str[start + 2])
        const d1 = ((b1 & 0x0f) << 4) | (b2 >> 2)
        const b3 = this.base64ToByte(str[start + 3])
        const d2 = ((b2 & 0x03) << 6) | b3
        const word = (d2 << 8) | d1
        bytes.appendUInt16(word)
      } else if (count === 3) {
        const b2 = this.base64ToByte(str[start + 2])
        const d1 = ((b1 & 0x0f) << 4) | (b2 >> 2)
        bytes.appendUInt8(d1)
      }
      start += count
    }
    return bytes.view()
  }

  /**
   * Decodes a base64 string.
   *
   * <p>Expects encoding with "-" and "_", and no padding.
   *
   * @param str Base64 string.
   * @return The decoded string or null.
   * @throws Error if it's an invalid base64 string, unless throwOnDecodeErrors is false.
   */
  public base64StringDecode(str: string): string | null {
    if (this.throwOnDecodeErrors) {
      const bytes = this.base64AlphabetToBytes(str)
      return this.textDecoder.decode(bytes)
    }
    try {
      const bytes = this.base64AlphabetToBytes(str)
      return this.textDecoder.decode(bytes)
    } catch (e) {
      return null
    }
  }
}

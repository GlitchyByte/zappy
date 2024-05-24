// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { StringGenerator, BytesGenerator, ZappyCommonBase } from "./ZappyCommonBase"

export class ZappyBase64StringDecoder extends ZappyCommonBase {

  /**
   * Map to convert from base64 to byte values.
   */
  private static readonly base64Map = new Map<number, number>([
    [65, 0], [66, 1], [67, 2], [68, 3], [69, 4], [70, 5], [71, 6], [72, 7], [73, 8], [74, 9],
    [75, 10], [76, 11], [77, 12], [78, 13], [79, 14], [80, 15], [81, 16], [82, 17], [83, 18], [84, 19],
    [85, 20], [86, 21], [87, 22], [88, 23], [89, 24], [90, 25],
    [97, 26], [98, 27], [99, 28], [100, 29], [101, 30], [102, 31], [103, 32], [104, 33], [105, 34], [106, 35],
    [107, 36], [108, 37], [109, 38], [110, 39], [111, 40], [112, 41], [113, 42], [114, 43], [115, 44], [116, 45],
    [117, 46], [118, 47], [119, 48], [120, 49], [121, 50], [122, 51],
    [48, 52], [49, 53], [50, 54], [51, 55], [52, 56], [53, 57], [54, 58], [55, 59], [56, 60], [57, 61],
    [45, 62], [95, 63]
  ])

  public readonly throwOnDecodeErrors: boolean
  protected textDecoder: TextDecoder | null = null

  /**
   * Creates a Zappy base64 decoder.
   *
   * @param throwOnDecodeErrors Flag to indicate if the object should throw exceptions when
   *          it finds errors during decoding. If false, the default, decoding errors will
   *          simply produce a null output.
   */
  public constructor(throwOnDecodeErrors = false) {
    super()
    this.throwOnDecodeErrors = throwOnDecodeErrors
  }

  protected *base64BytesToBytes(gen: BytesGenerator): BytesGenerator {
    const buffer = new Uint8Array(4)
    let bufferUsed = 0
    const outputBytes = new Uint8Array(3)
    const base64Decode = () => {
      // Base64 decode.
      // We have 4 6-bit bytes. Make 3 bytes out of them.
      const decoded = bufferUsed === 4 ? outputBytes : new Uint8Array(bufferUsed - 1)
      const b0 = buffer[0]
      const b1 = buffer[1]
      const b2 = bufferUsed > 2 ? buffer[2] : 0
      const b3 = bufferUsed > 3 ? buffer[3] : 0
      decoded[0] = (b0 << 2) | ((b1 & 0x30) >> 4)
      if (bufferUsed > 2) {
        decoded[1] = ((b1 & 0x0f) << 4) | ((b2 & 0x3c) >> 2)
      }
      if (bufferUsed > 3) {
        decoded[2] = ((b2 & 0x03) << 6) | b3
      }
      return decoded
    }
    for (const bytes of gen) {
      for (const byte of bytes) {
        const fullByte = ZappyBase64StringDecoder.base64Map.get(byte)
        if (fullByte === undefined) {
          throw new Error("Invalid base64 value!")
        }
        buffer[bufferUsed++] = fullByte
        if (bufferUsed === 4) {
          const decoded = base64Decode()
          bufferUsed = 0
          yield decoded
        }
      }
    }
    if (bufferUsed === 0) {
      return
    } else if (bufferUsed === 1) {
      throw new Error("Illegal number of bytes!")
    }
    const decoded = base64Decode()
    bufferUsed = 0
    yield decoded
  }

  private *bytesToUtf8Characters(gen: BytesGenerator): StringGenerator {
    for (const bytes of gen) {
      if (bytes.length === 0) {
        continue
      }
      const str = this.textDecoder!.decode(bytes, { stream: true })
      if (str.length !== 0) {
        yield str
      }
    }
  }

  protected resetDecoder() {
    this.textDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
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
    this.resetDecoder()
    if (this.throwOnDecodeErrors) {
      return this.stringCollector(this.bytesToUtf8Characters(this.base64BytesToBytes(this.stringToUtf8Bytes(str))))
    }
    try {
      return this.stringCollector(this.bytesToUtf8Characters(this.base64BytesToBytes(this.stringToUtf8Bytes(str))))
    } catch (e) {
      return null
    }
  }
}

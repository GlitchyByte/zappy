// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { ZappyBase64StringEncoder } from "./ZappyBase64StringEncoder"
import { BytesGenerator } from "./ZappyCommonBase"
import { GByteBuffer } from "./GByteBuffer"

/**
 * Zappy encoder.
 *
 * <p>It uses base64 as the message encoding, but the internal bytes are compressed.
 */
export class ZappyEncoder extends ZappyBase64StringEncoder {

  private static readonly MAX_DECIMAL = 0x7fffffff

  private readonly contractions: Map<number, Map<number, Uint8Array>>

  /**
   * Creates a Zappy encoder.
   *
   * @param contractions The contractions used for aiding compression.
   */
  public constructor(contractions: Map<number, Map<number, Uint8Array>>) {
    super()
    this.contractions = contractions
  }

  private addContractionToken(compressed: GByteBuffer, source: Uint8Array, index: number): number {
    const findLookupIndex = (lookup: Map<number, Uint8Array>, source: Uint8Array, index: number): number | null => {
      for (const [ lookupIndex, bytes ] of lookup) {
        if (bytes.length > (source.length - index)) {
          continue
        }
        let found = true
        for (let i = 0; i < bytes.length; ++i) {
          if (bytes[i] !== source[index + i]) {
            found = false
            break
          }
        }
        if (found) {
          return lookupIndex
        }
      }
      return null
    }

    for (let tableId = 16; tableId >= 0; --tableId) {
      const lookup = this.contractions.get(tableId)
      if (lookup === undefined) {
        continue
      }
      const lookupIndex = findLookupIndex(lookup, source, index)
      if (lookupIndex === null) {
        continue
      }
      if (tableId === 0) {
        const token = 0xe0 | lookupIndex
        compressed.appendUInt8(token)
      } else {
        const token = 0xf0 | (tableId - 1)
        compressed.appendUInt8(token)
        compressed.appendUInt8(lookupIndex)
      }
      return lookup.get(lookupIndex)!.length
    }
    return 0
  }

  private addRepeatToken(compressed: GByteBuffer, source: Uint8Array, index: number): number {
    const maxRepeatCount = 0x1f
    let count = 1
    let more: boolean
    const value = source[index]
    do {
      if (count >= maxRepeatCount) {
        break
      }
      const walker = index + count
      if (walker >= source.length) {
        break
      }
      const byte = source[walker]
      more = value === byte
      if (more) {
        ++count
      }
    } while (more)
    if (count < 3) {
      return 0
    }
    const token = 0xa0 | count
    compressed.appendUInt8(token)
    compressed.appendUInt8(value)
    return count
  }

  private isDigit(byte: number): boolean {
    return (byte >= 0x30) && (byte <= 0x39) // [0..9]
  }

  private isUppercaseHexDigit(byte: number): boolean {
    return (byte >= 0x41) && (byte <= 0x46) // [A..F]
  }

  private isLowercaseHexDigit(byte: number): boolean {
    return (byte >= 0x61) && (byte <= 0x66) // [a..f]
  }

  private addDecimalToken(compressed: GByteBuffer, source: Uint8Array, index: number, count: number) {
    // FIXME JS BUG: Can't have an unsigned 32bit int, if bit 31 is set JS interprets it as a negative number.
    //  So we'll only encode numbers up to 31 bits long. Though the problem only shows when decoding, we prevent
    //  encoding so we don't manifest the bug later.
    let digit = 0
    let value = 0
    while (digit < count) {
      const byte = source[index + digit]
      const newValue = (value * 10) + (byte - 0x30)
      if (newValue > ZappyEncoder.MAX_DECIMAL) {
        break
      }
      value = newValue
      ++digit
    }
    // Minimum encoding size is 2 bytes (token + UInt8). So we do not encode numbers under 100 which are
    // 2 bytes to start with in ASCII.
    if (value < 100) {
      return 0
    }
    let byteCount = 1
    if (value > 0xffff) {
      byteCount = 4
    } else if (value > 0xff) {
      byteCount = 2
    }
    const token = 0xc0 | byteCount
    compressed.appendUInt8(token)
    switch (byteCount) {
      case 4:
        compressed.appendUInt32(value)
        break
      case 2:
        compressed.appendUInt16(value)
        break
      default:
        compressed.appendUInt8(value)
    }
    return count
  }

  private addHexadecimalToken(compressed: GByteBuffer, source: Uint8Array, index: number, count: number, isUppercase: boolean) {
    // FIXME JS BUG: Can't have an unsigned 32bit int, if bit 31 is set JS interprets it as a negative number.
    //  So we'll only encode numbers up to 31 bits long. Though the problem only shows when decoding, we prevent
    //  encoding so we don't manifest the bug later.
    let digit = 0
    let value = 0
    while (digit < count) {
      const byte = source[index + digit]
      let digitValue = 0
      if (this.isDigit(byte)) {
        digitValue = byte - 0x30
      } else if (isUppercase) {
        digitValue = 0x0a + (byte - 0x41)
      } else {
        digitValue = 0x0a + (byte - 0x61)
      }
      if ((value & 0x08000000) !== 0) {
        break
      }
      value = (value * 0x10) + digitValue
      ++digit
    }
    // Minimum encoding size is 3 bytes (token + UInt16). So we do not encode hex numbers under 0x1000 which are
    // 3 bytes to start with in ASCII.
    if (value < 0x1000) {
      return 0
    }
    const byteCount = value > 0xffff ? 4 : 2
    const token = (isUppercase ? 0xd0 : 0xd8) | byteCount
    compressed.appendUInt8(token)
    switch (byteCount) {
      case 4:
        compressed.appendUInt32(value)
        break
      default:
        compressed.appendUInt16(value)
    }
    return digit
  }

  private addUnsignedIntegerToken(compressed: GByteBuffer, source: Uint8Array, index: number): number {
    // Collect up to 10 decimal or 8 hex.
    let count = 1
    let byte = source[index]
    let isUppercase = this.isUppercaseHexDigit(byte)
    let isHex = isUppercase || this.isLowercaseHexDigit(byte)
    while (true) {
      const walker = index + count
      if ((walker >= source.length) || (isHex && (count >= 8)) || (!isHex && (count >= 10))) {
        break
      }
      byte = source[walker]
      if (this.isDigit(byte)) {
        ++count
        continue
      }
      if (isHex) {
        if (isUppercase && this.isUppercaseHexDigit(byte)) {
          ++count
          continue
        }
        if (!isUppercase && this.isLowercaseHexDigit(byte)) {
          ++count
          continue
        }
        break
      }
      if (this.isUppercaseHexDigit(byte)) {
        isHex = true
        isUppercase = true
        ++count
        continue
      }
      if (this.isLowercaseHexDigit(byte)) {
        isHex = true
        ++count
      }
    }
    return isHex ?
      this.addHexadecimalToken(compressed, source, index, count, isUppercase) :
      this.addDecimalToken(compressed, source, index, count)
  }

  private isAscii(byte: number): boolean {
    return (byte & 0x80) === 0
  }

  private addAsciiToken(compressed: GByteBuffer, source: Uint8Array, index: number): number {
    compressed.appendUInt8(source[index])
    return 1
  }

  private addBlobToken(compressed: GByteBuffer, source: Uint8Array, index: number): number {
    const maxBlobSize = 0x1f
    let count = 1
    let more: boolean
    do {
      if (count >= maxBlobSize) {
        break
      }
      const walker = index + count
      if (walker >= source.length) {
        break
      }
      const byte = source[walker]
      more = !this.isAscii(byte)
      if (more) {
        ++count
      }
    } while (more)
    const token = 0x80 | count
    compressed.appendUInt8(token)
    for (let i = 0; i < count; ++i) {
      compressed.appendUInt8(source[index + i])
    }
    return count
  }

  private addNextToken(compressed: GByteBuffer, source: Uint8Array, index: number): number {
    {
      // Contraction.
      const used = this.addContractionToken(compressed, source, index)
      if (used > 0) {
        return used
      }
    }
    {
      // Repeated.
      const used = this.addRepeatToken(compressed, source, index)
      if (used > 0) {
        return used
      }
    }
    const byte = source[index]
    // Check for (0..9] || [A..F] || [a..f]
    if (((byte > 0x30) && (byte <= 0x39)) || ((byte >= 0x41) && (byte <= 0x46)) || ((byte >= 0x61) && (byte <= 0x66))) {
      // Unsigned integer.
      const used = this.addUnsignedIntegerToken(compressed, source, index)
      if (used > 0) {
        return used
      }
    }
    if (this.isAscii(byte)) {
      // ASCII. Take as-is.
      return this.addAsciiToken(compressed, source, index)
    }
    // Non-ASCII. Take as-is as a group.
    return this.addBlobToken(compressed, source, index)
  }

  private *stringToCompressedBytes(str: string): BytesGenerator {
    const source = this.textEncoder.encode(str)
    const compressed = GByteBuffer.create()
    let index = 0
    while (index < source.length) {
      compressed.reset()
      index += this.addNextToken(compressed, source, index)
      yield compressed.view()
    }
  }

  /**
   * Turns a string into a Zappy compressed string.
   *
   * @param str A string.
   * @return A Zappy compressed string.
   */
  public encode(str: string): string {
    return this.stringCollector(this.base64BytesToBase64Alphabet(this.bytesToBase64Bytes(this.stringToCompressedBytes(str))))
  }
}

// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { ZappyBase64StringDecoder } from "./ZappyBase64StringDecoder"
import { StringGenerator, BytesGenerator } from "./ZappyCommonBase"
import { GByteBuffer } from "./GByteBuffer"

/**
 * Encoding and decoding compressed web text for transport.
 *
 * <p>It uses base64 as the message encoding, but the internal bytes are compressed.
 */
export class ZappyDecoder extends ZappyBase64StringDecoder {

  private static readonly HEX_DIGITS_UPPERCASE = "0123456789ABCDEF"
  private static readonly HEX_DIGITS_LOWERCASE = "0123456789abcdef"

  private readonly contractions: Map<number, Map<number, Uint8Array>>
  private gen!: BytesGenerator
  private buffer: Uint8Array | null = null
  private bufferIndex = 0
  private expanded = GByteBuffer.create()

  /**
   * Creates a Zappy decoder.
   *
   * @param contractions The contractions used for aiding compression.
   * @param throwOnDecodeErrors Flag to indicate if the object should throw exceptions when
   *          it finds errors during decoding. If false, the default, decoding errors will
   *          simply produce a null output.
   */
  public constructor(contractions: Map<number, Map<number, Uint8Array>>, throwOnDecodeErrors = false) {
    super(throwOnDecodeErrors)
    this.contractions = contractions
  }

  private getNextByte(): number | null {
    if (this.buffer === null) {
      do {
        const item = this.gen.next()
        if (item.done) {
          return null
        }
        this.buffer = item.value
        this.bufferIndex = 0
      } while (this.buffer.length === 0)
    }
    const byte = this.buffer[this.bufferIndex]
    ++this.bufferIndex
    if (this.bufferIndex >= this.buffer.length) {
      this.buffer = null
    }
    return byte
  }

  private getValueOfNextBytes(byteCount: number): number {
    let value = 0
    for (let i = 0; i < byteCount; ++i) {
      const b = this.getNextByte()
      if (b === null) {
        throw new Error("Truncated message!")
      }
      value = (b << (i * 8)) | value
    }
    return value
  }

  private getExpandedString(): string | null {
    const str = this.textDecoder.decode(this.expanded.view(), { stream: true })
    this.expanded.reset()
    return str.length === 0 ? null : str
  }

  private resolveAsciiToken(byte: number): string | null {
    this.expanded.appendUInt8(byte)
    return this.getExpandedString()
  }

  private resolveBlobToken(byte: number): string | null {
    const count = byte & 0x1f
    for (let i = 0; i < count; ++i) {
      const b = this.getNextByte()
      if (b === null) {
        throw new Error("Truncated message!")
      }
      this.expanded.appendUInt8(b)
    }
    return this.getExpandedString()
  }

  private resolveRepeatToken(byte: number): string | null {
    const count = byte & 0x1f
    const b = this.getNextByte()
    if (b === null) {
      throw new Error("Truncated message!")
    }
    for (let i = 0; i < count; ++i) {
      this.expanded.appendUInt8(b)
    }
    return this.getExpandedString()
  }

  private resolveDecimalToken(byte: number): string | null {
    const count = byte & 0x0f
    if ((count != 1) && (count != 2) && (count != 4)) {
      throw new Error(`Invalid byte count: ${count}`)
    }
    const value = this.getValueOfNextBytes(count)
    const digits = value.toString()
    for (const ch of digits) {
      this.expanded.appendUInt8(ch.charCodeAt(0))
    }
    return this.getExpandedString()
  }

  private numberToHex(value: number, uppercase = false): string {
    if (value === 0) {
      return "0"
    }
    let str = ""
    const hexDigits = uppercase ? ZappyDecoder.HEX_DIGITS_UPPERCASE : ZappyDecoder.HEX_DIGITS_LOWERCASE
    while (value !== 0) {
      const digit = value & 0x0f
      value >>= 4
      str = hexDigits[digit] + str
    }
    return str
  }

  private resolveHexadecimalToken(byte: number, isUppercase: boolean): string | null {
    const count = byte & 0x07
    if ((count != 2) && (count != 4)) {
      throw new Error(`Invalid byte count: ${count}`)
    }
    const value = this.getValueOfNextBytes(count)
    const digits = this.numberToHex(value, isUppercase)
    for (const ch of digits) {
      this.expanded.appendUInt8(ch.charCodeAt(0))
    }
    return this.getExpandedString()
  }

  private resolveContractionToken(byte: number): string | null {
    let tableId: number
    let lookupIndex: number
    if ((byte & 0x10) === 0) {
      // Fast lookup!
      tableId = 0
      lookupIndex = byte & 0x0f
    } else {
      tableId = (byte & 0x0f) + 1
      lookupIndex = this.getValueOfNextBytes(1)
    }
    const lookup = this.contractions.get(tableId)
    if (lookup === undefined) {
      throw new Error(`No contractions found [tableId: ${tableId}]`)
    }
    const bytes = lookup.get(lookupIndex)
    if (bytes === undefined) {
      throw new Error(`Contraction lookup index ${tableId}]:${lookupIndex} not found!`)
    }
    this.expanded.append(bytes)
    return this.getExpandedString()
  }

  private resolveNextToken(byte: number): string | null {
    if ((byte & 0x80) === 0) {
      // ASCII character. Take as-is.
      return this.resolveAsciiToken(byte)
    }
    if ((byte & 0x40) === 0) {
      // Level 1 compressed instruction.
      if ((byte & 0x20) === 0) {
        // Blob. Take as-is as a group.
        return this.resolveBlobToken(byte)
      }
      // Repeated character.
      return this.resolveRepeatToken(byte)
    }
    // Level 2 compressed instruction.
    if ((byte & 0x20) === 0) {
      // Unsigned integer.
      if ((byte & 0x10) === 0) {
        // Decimal integer.
        return this.resolveDecimalToken(byte)
      }
      // Hexadecimal integer.
      const isUppercase = (byte & 0x08) === 0
      return this.resolveHexadecimalToken(byte, isUppercase)
    }
    // Contraction lookup.
    return this.resolveContractionToken(byte)
  }

  private *compressedBytesToString(gen: BytesGenerator): StringGenerator {
    this.gen = gen
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const byte = this.getNextByte()
      if (byte === null) {
        break
      }
      const str = this.resolveNextToken(byte)
      if (str !== null) {
        yield str
      }
    }
  }

  /**
   * Turns a Zappy compressed string into a string.
   *
   * @param str A Zappy compressed string.
   * @return Expanded string or null.
   * @throws Error if it's an invalid Zappy string, unless throwOnDecodeErrors is false.
   */
  public decode(str: string): string | null {
    this.resetDecoder()
    if (this.throwOnDecodeErrors) {
      return this.stringCollector(this.compressedBytesToString(this.base64BytesToBytes(this.stringToUtf8Bytes(str))))
    }
    try {
      return this.stringCollector(this.compressedBytesToString(this.base64BytesToBytes(this.stringToUtf8Bytes(str))))
    } catch (e) {
      return null
    }
  }
}

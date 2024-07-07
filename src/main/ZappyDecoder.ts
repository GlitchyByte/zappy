// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { ZappyBase64StringDecoder } from "./ZappyBase64StringDecoder"
import { GByteBuffer, GByteBufferReader } from "./GByteBuffer"
import { numberToHexBytes } from "./gutils"

/**
 * Zappy decoder.
 *
 * <p>It uses base64 as the message encoding, but the internal bytes are compressed.
 */
export class ZappyDecoder extends ZappyBase64StringDecoder {

  private readonly contractions: Map<number, Map<number, Uint8Array>>
  private readonly zappyBuffer = GByteBuffer.create()

  /**
   * Creates a Zappy decoder.
   *
   * @param contractions The contractions used for aiding compression.
   * @param throwOnDecodeErrors Flag to indicate if the object should throw exceptions when
   *          it finds errors during decoding. If false, decoding errors will simply produce
   *          a null output.
   */
  public constructor(contractions: Map<number, Map<number, Uint8Array>>, throwOnDecodeErrors: boolean) {
    super(throwOnDecodeErrors)
    this.contractions = contractions
  }

  private resolveAsciiToken(decompressed: GByteBuffer, byte: number) {
    decompressed.appendUInt8(byte)
  }

  private resolveBlobToken(decompressed: GByteBuffer, byte: number, source: GByteBufferReader) {
    const count = byte & 0x1f
    for (let i = 0; i < count; ++i) {
      const b = source.readUInt8()
      decompressed.appendUInt8(b)
    }
  }

  private resolveRepeatToken(decompressed: GByteBuffer, byte: number, source: GByteBufferReader) {
    const count = byte & 0x1f
    const b = source.readUInt8()
    for (let i = 0; i < count; ++i) {
      decompressed.appendUInt8(b)
    }
  }

  private resolveDecimalToken(decompressed: GByteBuffer, byte: number, source: GByteBufferReader) {
    const count = byte & 0x0f
    let value: number
    switch (count) {
      case 1:
        value = source.readUInt8()
        break
      case 2:
        value = source.readUInt16()
        break
      case 4:
        value = source.readUInt32()
        break
      default:
        throw new Error(`Invalid byte count: ${count}`)
    }
    const digits = value.toString()
    for (const ch of digits) {
      decompressed.appendUInt8(ch.charCodeAt(0))
    }
  }

  private resolveHexadecimalToken(decompressed: GByteBuffer, byte: number, source: GByteBufferReader, isUppercase: boolean) {
    const count = byte & 0x07
    let value: number
    switch (count) {
      case 2:
        value = source.readUInt16()
        break
      case 4:
        value = source.readUInt32()
        break
      default:
        throw new Error(`Invalid byte count: ${count}`)
    }
    const digits = numberToHexBytes(value, isUppercase)
    decompressed.appendAll(digits)
  }

  private resolveContractionToken(decompressed: GByteBuffer, byte: number, source: GByteBufferReader) {
    let tableId: number
    let lookupIndex: number
    if ((byte & 0x10) === 0) {
      // Fast lookup!
      tableId = 0
      lookupIndex = byte & 0x0f
    } else {
      tableId = (byte & 0x0f) + 1
      lookupIndex = source.readUInt8()
    }
    const lookup = this.contractions.get(tableId)
    if (lookup === undefined) {
      throw new Error(`No contractions found [tableId: ${tableId}]`)
    }
    const bytes = lookup.get(lookupIndex)
    if (bytes === undefined) {
      throw new Error(`Contraction lookup index [${tableId}]:${lookupIndex} not found!`)
    }
    decompressed.appendAll(bytes)
  }

  private resolveNextToken(decompressed: GByteBuffer, byte: number, source: GByteBufferReader) {
    if ((byte & 0x80) === 0) {
      // ASCII character. Take as-is.
      this.resolveAsciiToken(decompressed, byte)
      return
    }
    if ((byte & 0x40) === 0) {
      // Level 1 compressed instruction.
      if ((byte & 0x20) === 0) {
        // Blob. Take as-is as a group.
        this.resolveBlobToken(decompressed, byte, source)
        return
      }
      // Repeated character.
      this.resolveRepeatToken(decompressed, byte, source)
      return
    }
    // Level 2 compressed instruction.
    if ((byte & 0x20) === 0) {
      // Unsigned integer.
      if ((byte & 0x10) === 0) {
        // Decimal integer.
        this.resolveDecimalToken(decompressed, byte, source)
        return
      }
      // Hexadecimal integer.
      const isUppercase = (byte & 0x08) === 0
      this.resolveHexadecimalToken(decompressed, byte, source, isUppercase)
      return
    }
    // Contraction lookup.
    this.resolveContractionToken(decompressed, byte, source)
  }

  private stringToDecompressedBytes(bytes: Uint8Array): Uint8Array {
    const source = GByteBufferReader.fromByteArray(bytes)
    const decompressed = this.zappyBuffer
    decompressed.reset()
    while (!source.isAtEnd()) {
      const byte = source.readUInt8()
      this.resolveNextToken(decompressed, byte, source)
    }
    return decompressed.view()
  }

  /**
   * Turns a Zappy compressed string into a string.
   *
   * @param str A Zappy compressed string.
   * @return Expanded string or null.
   * @throws Error if it's an invalid Zappy string, unless throwOnDecodeErrors is false.
   */
  public decode(str: string): string | null {
    if (this.throwOnDecodeErrors) {
      let bytes = this.base64AlphabetToBytes(str)
      bytes = this.stringToDecompressedBytes(bytes)
      return this.textDecoder.decode(bytes)
    }
    try {
      let bytes = this.base64AlphabetToBytes(str)
      bytes = this.stringToDecompressedBytes(bytes)
      return this.textDecoder.decode(bytes)
    } catch (e) {
      return null
    }
  }
}

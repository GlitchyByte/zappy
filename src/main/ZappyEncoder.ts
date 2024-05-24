// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { ZappyBase64StringEncoder } from "./ZappyBase64StringEncoder"
import { BytesGenerator } from "./ZappyCommonBase"
import { GByteBuffer } from "./GByteBuffer"

/**
 * Encoding and decoding compressed web text for transport.
 *
 * <p>It uses base64 as the message encoding, but the internal bytes are compressed.
 */
export class ZappyEncoder extends ZappyBase64StringEncoder {

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

  private *stringToCompressedBytes(str: string): BytesGenerator {
    const isAscii = (byte: number): boolean => {
      return (byte & 0x80) === 0
    }

    const isDigit = (byte: number): boolean => {
      return (byte >= 0x30) && (byte <= 0x39) // [0..9]
    }

    // const isHexDigit = (byte: number): boolean => {
    //   return ((byte >= 0x30) && (byte <= 0x39)) || // [0..9]
    //     ((byte >= 0x41) && (byte <= 0x46)) ||      // [A..F]
    //     ((byte >= 0x61) && (byte <= 0x66))         // [a..f]
    // }

    const addUnsignedIntegerToken = (compressed: GByteBuffer, source: Uint8Array, index: number): number => {
      // FIXME JS BUG: Can't have an unsigned 32bit int, if bit 31 is set JS makes it negative.
      //  So we'll only encode numbers up to 31 bits long. Though the problem only shows when
      //  decoding, we prevent encoding so we don't manifest the bug later.
      const maxNumber = 0x7fffffff
      let count = 1
      let more: boolean
      let value = source[index] - 0x30
      do {
        const walker = index + count
        if (walker >= source.length) {
          break
        }
        const byte = source[walker]
        more = isDigit(byte)
        if (more) {
          const newValue = (value * 10) + (byte - 0x30)
          if (newValue > maxNumber) {
            break
          }
          value = newValue
          ++count
        }
      } while (more)
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

    const addAsciiToken = (compressed: GByteBuffer, source: Uint8Array, index: number): number => {
      compressed.appendUInt8(source[index])
      return 1
    }

    const addRepeatToken = (compressed: GByteBuffer, source: Uint8Array, index: number): number => {
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

    const addBlobToken = (compressed: GByteBuffer, source: Uint8Array, index: number): number => {
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
        more = !isAscii(byte)
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

    const addContractionToken = (compressed: GByteBuffer, source: Uint8Array, index: number): number => {
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

    const addNextToken = (compressed: GByteBuffer, source: Uint8Array, index: number): number => {
      {
        // Contraction.
        const used = addContractionToken(compressed, source, index)
        if (used > 0) {
          return used
        }
      }
      {
        // Repeated.
        const used = addRepeatToken(compressed, source, index)
        if (used > 0) {
          return used
        }
      }
      const byte = source[index]
      // Check for (0..9] || [a..f] || [A..F].
      if (((byte > 0x30) && (byte <= 0x39)) /*|| ((byte >= 0x41) && (byte <= 0x46)) || ((byte >= 0x61) && (byte <= 0x66))*/) {
        // Unsigned integer.
        const used = addUnsignedIntegerToken(compressed, source, index)
        if (used > 0) {
          return used
        }
      }
      if (isAscii(byte)) {
        // ASCII. Take as-is.
        return addAsciiToken(compressed, source, index)
      }
      // Non-ASCII. Take as-is as a group.
      return addBlobToken(compressed, source, index)
    }

    const source = this.textEncoder.encode(str)
    const compressed = GByteBuffer.create()
    let index = 0
    while (index < source.length) {
      compressed.reset()
      index += addNextToken(compressed, source, index)
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

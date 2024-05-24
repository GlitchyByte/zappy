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

  private readonly contractions: Map<number, Map<number, Uint8Array>>

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

  private *compressedBytesToString(gen: BytesGenerator): StringGenerator {
    let buffer: Uint8Array | null = null
    let bufferIndex = 0

    const getNextByte = (): number | null => {
      if (buffer === null) {
        do {
          const item = gen.next()
          if (item.done) {
            return null
          }
          buffer = item.value
          bufferIndex = 0
        } while (buffer.length === 0)
      }
      const byte = buffer[bufferIndex]
      ++bufferIndex
      if (bufferIndex >= buffer.length) {
        buffer = null
      }
      return byte
    }

    const expanded = GByteBuffer.create()

    const resolveAsciiToken = (byte: number): [ boolean, string | null ] => {
      expanded.appendUInt8(byte)
      const str = this.textDecoder!.decode(expanded.view(), { stream: true })
      expanded.reset()
      return [ true, str.length === 0 ? null : str ]
    }

    const resolveBlobToken = (byte: number): [ boolean, string | null ] => {
      const count = byte & 0x1f
      for (let i = 0; i < count; ++i) {
        const b = getNextByte()
        if (b === null) {
          throw new Error("Truncated message!")
        }
        expanded.appendUInt8(b)
      }
      const str = this.textDecoder!.decode(expanded.view(), { stream: true })
      expanded.reset()
      return [ true, str.length === 0 ? null : str ]
    }

    const resolveRepeatToken = (byte: number): [ boolean, string | null ] => {
      const count = byte & 0x1f
      const b = getNextByte()
      if (b === null) {
        throw new Error("Truncated message!")
      }
      for (let i = 0; i < count; ++i) {
        expanded.appendUInt8(b)
      }
      const str = this.textDecoder!.decode(expanded.view(), { stream: true })
      expanded.reset()
      return [ true, str.length === 0 ? null : str ]
    }

    const getValueOfNextBytes = (byteCount: number): number => {
      const byteCountsAllowed = [ 4, 2, 1 ]
      if (!byteCountsAllowed.includes(byteCount)) {
        throw new Error("Invalid byte count!")
      }
      let value = 0
      for (let i = 0; i < byteCount; ++i) {
        const b = getNextByte()
        if (b === null) {
          throw new Error("Truncated message!")
        }
        value = (b << (i * 8)) | value
      }
      return value
    }

    const resolveNumberToken = (byte: number): [ boolean, string | null ] => {
      const count = byte & 0x1f
      const value = getValueOfNextBytes(count)
      const digits = value.toString()
      for (const ch of digits) {
        expanded.appendUInt8(ch.charCodeAt(0))
      }
      const str = this.textDecoder!.decode(expanded.view(), { stream: true })
      expanded.reset()
      return [ true, str.length === 0 ? null : str ]
    }

    const resolveContractionToken = (byte: number): [ boolean, string | null ] => {
      let tableId: number
      let lookupIndex: number
      if ((byte & 0x10) === 0) {
        // Fast lookup!
        tableId = 0
        lookupIndex = byte & 0x0f
      } else {
        tableId = (byte & 0x0f) + 1
        lookupIndex = getValueOfNextBytes(1)
      }
      const lookup = this.contractions.get(tableId)
      if (lookup === undefined) {
        throw new Error(`No contractions found [tableId: ${tableId}]`)
      }
      const bytes = lookup.get(lookupIndex)
      if (bytes === undefined) {
        throw new Error(`Contraction lookup index ${tableId}]:${lookupIndex} not found!`)
      }
      expanded.append(bytes)
      const str = this.textDecoder!.decode(expanded.view(), { stream: true })
      expanded.reset()
      return [ true, str.length === 0 ? null : str ]
    }

    const resolveNextToken = (byte: number): [ boolean, string | null ] => {
      if ((byte & 0x80) === 0) {
        // ASCII character. Take as-is.
        return resolveAsciiToken(byte)
      }
      if ((byte & 0x40) === 0) {
        if ((byte & 0x20) === 0) {
          // Blob. Take as-is as a group.
          return resolveBlobToken(byte)
        }
        // Repeated character.
        return resolveRepeatToken(byte)
      }
      if ((byte & 0x20) === 0) {
        // Digits.
        return resolveNumberToken(byte)
      }
      return resolveContractionToken(byte)
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const byte = getNextByte()
      if (byte === null) {
        break
      }
      const [ handled, str ] = resolveNextToken(byte)
      if (handled) {
        if (str !== null) {
          yield str
        }
        continue
      }
      throw new Error("Unknown token!")
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

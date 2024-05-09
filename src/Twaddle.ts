// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { GByteBuffer } from "./GByteBuffer"
import { defaultContractionsSource } from "./twaddle-default-contraction-source"

type StringGenerator = Generator<string, void, void>
type BytesGenerator = Generator<Uint8Array, void, void>

/**
 * Encoding and decoding compressed web text for transport.
 *
 * <p>It uses base64 as the message encoding, but the internal bytes are compressed.
 */
export class Twaddle {

  /**
   * Base64 alphabet and map to convert back to byte value.
   */
  private static readonly base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
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

  private readonly textEncoder = new TextEncoder()
  private readonly textDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
  private readonly contractions = new Map<number, Map<number, Uint8Array>>()

  /**
   * Creates a Twaddle object ready to encode and decode messages.
   *
   * @param source The contraction source used for aiding compression. These will be overlaid
   *          the default minimal contractions that favor json.
   *          If source is null (and it has to be explicit by design), then only the default
   *          minimal contraction source is used. It is highly recommended users of this class
   *          provide their own contraction source. Using the default as a base is a good idea.
   */
  public constructor(source: Map<number, string[]> | null) {
    if (source === null) {
      source = new Map<number, string[]>()
    }
    // Compute contraction tables.
    const createLookup = (byteSize: number, list: string[]): Map<number, Uint8Array> => {
      const lookup = new Map<number, Uint8Array>()
      list.sort((a, b) => b.length - a.length)
      for (const entry of list) {
        const bytes = this.textEncoder.encode(entry)
        if (bytes.length <= (byteSize + 1)) {
          throw new Error(`Contraction is smaller than encoding: [${byteSize}] ${entry}`)
        }
        lookup.set(lookup.size, bytes)
      }
      return lookup
    }

    // Layer contraction tables.
    const lookupSizes = [ 4, 2, 1, 0 ]
    for (const byteSize of lookupSizes) {
      const list = source.get(byteSize) ?? defaultContractionsSource.get(byteSize)
      if (list === undefined) {
        continue
      }
      const lookup = createLookup(byteSize, list)
      this.contractions.set(byteSize, lookup)
    }
  }

  private *stringToUtf8Bytes(str: string): BytesGenerator {
    const bytes = this.textEncoder.encode(str)
    yield bytes
  }

  private *bytesToBase64Bytes(gen: BytesGenerator): BytesGenerator {
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

  private *base64BytesToBase64Alphabet(gen: BytesGenerator): StringGenerator {
    for (const bytes of gen) {
      for (const byte of bytes) {
        yield Twaddle.base64Alphabet[byte]
      }
    }
  }

  private *base64BytesToBytes(gen: BytesGenerator): BytesGenerator {
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
        const fullByte = Twaddle.base64Map.get(byte)
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
      const str = this.textDecoder.decode(bytes, { stream: true })
      if (str.length !== 0) {
        yield str
      }
    }
  }

  private stringCollector(gen: StringGenerator): string {
    let buffer = ""
    for (const str of gen) {
      buffer += str
    }
    return buffer
  }

  /**
   * Encodes a string into a base64 string.
   *
   * @param str Original string to encode.
   * @return A base64 string.
   */
  public base64StringEncode(str: string): string {
    return this.stringCollector(this.base64BytesToBase64Alphabet(this.bytesToBase64Bytes(this.stringToUtf8Bytes(str))))
  }

  /**
   * Decodes a base64 string.
   *
   * @param str Base64 string.
   * @return The decoded string.
   * @throws Error if it's an invalid base64 string.
   */
  public base64StringDecode(str: string): string {
    return this.stringCollector(this.bytesToUtf8Characters(this.base64BytesToBytes(this.stringToUtf8Bytes(str))))
  }

  private *stringToCompressedBytes(str: string): BytesGenerator {
    const isAscii = (byte: number): boolean => {
      return (byte & 0x80) === 0
    }

    const isDigit = (byte: number): boolean => {
      return (byte >= 0x30) && (byte <= 0x39)
    }

    const addNumberToken = (compressed: GByteBuffer, source: Uint8Array, index: number): number => {
      const maxNumberSize = 0xffffffff
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
          if (newValue > maxNumberSize) {
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

    const addNonAsciiToken = (compressed: GByteBuffer, source: Uint8Array, index: number): number => {
      const maxBlobSize = 0x3f
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

      const lookupSizes = [ 4, 2, 1, 0 ]
      for (const lookupSize of lookupSizes) {
        const lookup = this.contractions.get(lookupSize)
        if (lookup === undefined) {
          continue
        }
        const lookupIndex = findLookupIndex(lookup, source, index)
        if (lookupIndex === null) {
          continue
        }
        if (lookupSize === 0) {
          const token = 0xe0 | lookupIndex
          compressed.appendUInt8(token)
        } else {
          const token = 0xf0 | lookupSize
          compressed.appendUInt8(token)
          switch (lookupSize) {
            case 4:
              compressed.appendUInt32(lookupIndex)
              break
            case 2:
              compressed.appendUInt16(lookupIndex)
              break
            default:
              compressed.appendUInt8(lookupIndex)
          }
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
      const byte = source[index]
      if (isDigit(byte)) {
        // Digits.
        const used = addNumberToken(compressed, source, index)
        if (used > 0) {
          return used
        }
      }
      if (isAscii(byte)) {
        // ASCII. Take as-is.
        return addAsciiToken(compressed, source, index)
      }
      // Non-ASCII. Take as-is as a group.
      return addNonAsciiToken(compressed, source, index)
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
      const str = this.textDecoder.decode(expanded.view(), { stream: true })
      expanded.reset()
      return [ true, str.length === 0 ? null : str ]
    }

    const resolveNonAsciiToken = (byte: number): [ boolean, string | null ] => {
      const count = byte & 0x3f
      for (let i = 0; i < count; ++i) {
        const b = getNextByte()
        if (b === null) {
          throw new Error("Truncated message!")
        }
        expanded.appendUInt8(b)
      }
      const str = this.textDecoder.decode(expanded.view(), { stream: true })
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
      const str = this.textDecoder.decode(expanded.view(), { stream: true })
      expanded.reset()
      return [ true, str.length === 0 ? null : str ]
    }

    const resolveContractionToken = (byte: number): [ boolean, string | null ] => {
      let lookupSize: number
      let lookupIndex: number
      if ((byte & 0x10) === 0) {
        // Fast lookup!
        lookupSize = 0
        lookupIndex = byte & 0x0f
      } else {
        lookupSize = byte & 0x0f
        lookupIndex = getValueOfNextBytes(lookupSize)
      }
      const lookup = this.contractions.get(lookupSize)
      if (lookup === undefined) {
        throw new Error(`Not contractions found of size: ${lookupSize}`)
      }
      const bytes = lookup.get(lookupIndex)
      if (bytes === undefined) {
        throw new Error(`Contraction lookup index ${lookupIndex} not found!`)
      }
      expanded.append(bytes)
      const str = this.textDecoder.decode(expanded.view(), { stream: true })
      expanded.reset()
      return [ true, str.length === 0 ? null : str ]
    }

    const resolveNextToken = (byte: number): [ boolean, string | null ] => {
      if ((byte & 0x80) === 0) {
        // ASCII. Take as-is.
        return resolveAsciiToken(byte)
      }
      if ((byte & 0x40) === 0) {
        // Non-ASCII. Take as-is as a group.
        return resolveNonAsciiToken(byte)
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
   * Turns a string into a Twaddle compressed string.
   *
   * @param str A string.
   * @return A Twaddle compressed string.
   */
  public encode(str: string): string {
    return this.stringCollector(this.base64BytesToBase64Alphabet(this.bytesToBase64Bytes(this.stringToCompressedBytes(str))))
  }

  /**
   * Turns a Twaddle compressed string into a string.
   *
   * @param str A Twaddle compressed string.
   * @return Expanded string.
   */
  public decode(str: string): string | null {
    return this.stringCollector(this.compressedBytesToString(this.base64BytesToBytes(this.stringToUtf8Bytes(str))))
  }
}

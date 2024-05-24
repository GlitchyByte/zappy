// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { defaultContractions } from "./zappy-default-contractions"
import { ZappyEncoder } from "./ZappyEncoder"
import { ZappyDecoder } from "./ZappyDecoder"

/**
 * Encoding and decoding compressed web text for transport.
 *
 * <p>It uses base64 as the message encoding, but the internal bytes are compressed.
 */
export class Zappy {

  private readonly encoder: ZappyEncoder
  private readonly decoder: ZappyDecoder

  /**
   * Creates a Zappy object ready to encode and decode messages.
   *
   * @param source The contraction source used for aiding compression. These will be overlaid
   *          on the default contractions that favors json. Whole tables are replaced in the
   *          overlay process, not individual items within a table.
   *          If source is null (and it has to be explicit by design), then only the default
   *          contractions are used. It is highly recommended users of this class add their
   *          own contractions.
   * @param throwOnDecodeErrors Flag to indicate if the object should throw exceptions when
   *          it finds errors during decoding. If false, the default, decoding errors will
   *          simply produce a null output.
   */
  public constructor(source: Map<number, string[]> | null, throwOnDecodeErrors = false) {
    if (source === null) {
      source = new Map<number, string[]>()
    } else {
      for (const key of source.keys()) {
        if ((key < 0) || (key > 16)) {
          throw new Error(`Invalid tableId: ${key}`)
        }
      }
    }
    const textEncoder = new TextEncoder()
    const contractions = new Map<number, Map<number, Uint8Array>>()
    // Layer contraction tables.
    for (let tableId = 0; tableId <= 16; ++tableId) {
      const list = source.get(tableId) ?? defaultContractions.get(tableId)
      if (list === undefined) {
        continue
      }
      const lookup = this.createLookup(tableId, list, textEncoder)
      contractions.set(tableId, lookup)
    }
    // Create encoder and decoder.
    this.encoder = new ZappyEncoder(contractions)
    this.decoder = new ZappyDecoder(contractions, throwOnDecodeErrors)
  }

  private createLookup(tableId: number, list: string[], textEncoder: TextEncoder): Map<number, Uint8Array> {
    // Convert to bytes for contraction tables.
    const lookup = new Map<number, Uint8Array>()
    list.sort((a, b) => b.length - a.length)
    for (const entry of list) {
      const bytes = textEncoder.encode(entry)
      if (tableId === 0) {
        if (bytes.length <= 1) {
          throw new Error(`Contraction is smaller than encoding: [1-byte] ${entry}`)
        }
      } else if (bytes.length <= 2) {
        throw new Error(`Contraction is smaller than encoding: [2-byte] ${entry}`)
      }
      lookup.set(lookup.size, bytes)
    }
    return lookup
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
    return this.encoder.base64StringEncode(str)
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
    return this.decoder.base64StringDecode(str)
  }

  /**
   * Turns a string into a Zappy compressed string.
   *
   * @param str A string.
   * @return A Zappy compressed string.
   */
  public encode(str: string): string {
    return this.encoder.encode(str)
  }

  /**
   * Turns a Zappy compressed string into a string.
   *
   * @param str A Zappy compressed string.
   * @return Expanded string or null.
   * @throws Error if it's an invalid Zappy string, unless throwOnDecodeErrors is false.
   */
  public decode(str: string): string | null {
    return this.decoder.decode(str)
  }
}

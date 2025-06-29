// Copyright 2024-2025 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

import { stringToBytes } from "@glitchybyte/dash"

export type ZappyContractionTables = Map<number, Map<number, Uint8Array>>

function createLookup(tableId: number, list: string[]): Map<number, Uint8Array> {
  // Convert to bytes for contraction tables.
  const lookup = new Map<number, Uint8Array>()
  list.sort((a, b) => b.length - a.length)
  for (const entry of list) {
    const bytes = stringToBytes(entry)
    if (tableId === 0) {
      if (bytes.length <= 1) {
        throw new Error(`Contraction is smaller than encoding: (table-0)[1-byte] ${entry}`)
      }
    } else if (bytes.length <= 2) {
      throw new Error(`Contraction is smaller than encoding: (table-${tableId})[2-byte] ${entry}`)
    }
    lookup.set(lookup.size, bytes)
  }
  return lookup
}

/**
 * Creates a Zappy contraction tables object ready to be used for encoding and decoding messages.
 *
 * @param contractions The contraction source used for aiding compression. These will be overlaid
 *          over each other. Whole tables are replaced in the overlay process, not individual
 *          items within a table.
 */
export function createZappyContractionTables(...contractions: Map<number, string[]>[]): ZappyContractionTables {
  const contractionTables: ZappyContractionTables = new Map()
  // Layer contraction tables.
  for (let tableId = 0; tableId <= 16; ++tableId) {
    let list: string[] | null = null
    for (const source of contractions.toReversed()) {
      const sourceList = source.get(tableId)
      if (sourceList) {
        list = sourceList
        break
      }
    }
    if (!list) {
      continue
    }
    const lookup = createLookup(tableId, list)
    contractionTables.set(tableId, lookup)
  }
  return contractionTables
}

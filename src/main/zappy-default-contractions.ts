// Copyright 2024 GlitchyByte
// SPDX-License-Identifier: Apache-2.0

/**
 * Default contractions for Zappy.
 *
 * <p>It is highly recommended developers using Zappy add their own contraction tables,
 * or even replace them completely.
 *
 * <p>These defaults are optimized for json messages and URLs.
 */
export const defaultContractions = new Map<number, string[]>([
  [0, [ // Up to 16 entries.
    "null",
    "true",
    "false",
    "https://",
    "0x",
    "{\"",
    "\"}",
    "\":",
    "\":\"",
    ",\"",
    "\",\"",
    "\":[",
    "\":[\"",
    "\":[{",
    "}]",
    "]}"
  ]],
  [16, [ // Up to 256 entries.
    "localhost",
    "127.0.0.1",
    "http://",
    "ws://",
    "://",
    ".com",
    ".org",
    ".net",
    ".edu",
    ".io",
    ".dev",
    ".gg"
  ]]
])

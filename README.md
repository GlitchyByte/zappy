# Zappy

[![version](https://img.shields.io/badge/version-2.0.0-dodgerblue)](https://github.com/GlitchyByte/zappy/releases/tag/v2.0.0)
[![spec](https://img.shields.io/badge/spec-1.1.0-palegreen)](https://github.com/GlitchyByte/zappy/blob/v2.0.0/SPEC.md)

Library for compressing and encoding web-related text
(json, URLs, UUIDs, etc.) into a URL-safe format for
efficient transport.

[Read the spec here!](https://github.com/GlitchyByte/zappy/blob/v2.0.0/SPEC.md)

#### Goals

* Capable of encoding any valid utf-8 string.
* Transportable as URL-safe plain text.
* Produce smaller encoded string than vanilla base64 on ASCII payloads.
* Fast encoding and decoding.

#### Non-Goals

* Encryption. This ain't it. It's obfuscation at best.

#### Notes

To fully take advantage of Zappy, you, as a dev, should provide
`contraction tables` specialized to your payloads.

A good rule of thumb is to include all known identifiers in your json
payloads (e.g., name, age, username, score, etc.), and common words
that come up often in your communication (for this example, obvious
choices for me would be "glichybyte" and "zappy").

Zappy strings should not be stored. They are designed for transport
where one side encodes before transmitting and the other side decodes
after receiving. If the `contraction tables` change between encoding
and decoding, it's very possible the output will not be the same or
even invalid. Keep this in mind when decoding and handle these cases
accordingly. That is, always sanitize your (decoded) output and handle
decoding error conditions.

## API

```ts
// Create comtraction tables.
function createZappyContractionTables(...contractions: Map<number, string[]>[]): ZappyContractionTables
// Generally you want to pass at least 'zappyDefaultContractions'.

// Encode and decode a Base64Url string.
function encodeStringToBase64(str: string): string
function decodeBase64ToString(str: string): string

// Encode and decode a DeflateRaw-Base64Url string.
function encodeStringToDeflate(str: string): string
function decodeDeflateToString(str: string): string

// Encode and decode a Zappy string.
function encodeStringToZappy(str: string): string
function decodeZappyToString(str: string): string
```

## How to use

### Add package to your project

```bash
npm install @glitchybyte/zappy
```

### Define contraction tables

There are 17 `contraction tables` available for use [0..16].

Table 0 is called the *fast lookup table*, it gets the best compression
gains, but only 16 entries are permitted. Entries in table 0 can have
a minimum of 2 characters (or 2 bytes when converted to UTF-8) and
still have a gain.

Tables 1-16 allow 256 entries each. Entries can have a minimum of 3
characters (or 3 bytes when converted to UTF-8).

Developer defined `contraction tables` are overlaid onto
[default tables](https://github.com/GlitchyByte/zappy/blob/main/src/main/zappy-default-contractions.ts).
There is a default table 0 specialized in json, and a default
table 16 with common strings.

Define your `contraction tables` like so:

```ts
const contractions = new Map<number, string[]>([
  [1, [
    "glitchybyte",
    "zappy",
    "codeUrl",
    "msg"
  ]]
])
```

### Encode and decode in your code

```ts
import { 
  createZappyContractionTables, 
  decodeZappyToString,
  encodeStringToBase64,
  zappyDefaultContractions
} from "@glitchybyte/zappy"

const contractionTables = createZappyContractionTables(zappyDefaultContractions, contractions)
const json = '{' +
  '"codeUrl":"https://github.com/glitchybyte/zappy",' +
  '"msg":"When I deal with internationalization I think of defenestration."' +
  '}'
const encoded = encodeStringToZappy(json, contractionTables)
console.log(`[${encoded.length}] ${encoded}`)
// [116] 6vAB5uBnaXRodWL_BC_wAC_wAufwA-ZXaGVuIEkgZGVhbCB3aXRoIGludGVy
//       bmF0aW9uYWxpemF0aW9uIEkgdGhpbmsgb2Yg2v7ebmVzdHJhdGlvbi7r

// While Base64Url is:
const base64Encoded = encodeStringToBase64(json)
console.log(`[${base64Encoded.length}] ${base64Encoded}`)
// [164] eyJjb2RlVXJsIjoiaHR0cHM6Ly9naXRodWIuY29tL2dsaXRjaHlieXRlL3ph
//       cHB5IiwibXNnIjoiV2hlbiBJIGRlYWwgd2l0aCBpbnRlcm5hdGlvbmFsaXph
//       dGlvbiBJIHRoaW5rIG9mIGRlZmVuZXN0cmF0aW9uLiJ9

const decoded = decodeZappyToString(encoded, contractionTables)
console.log(`[${decoded.length}] ${decoded}`)
// [123] {"codeUrl":"https://github.com/glitchybyte/zappy","msg":"Whe
//       n I deal with internationalization I think of defenestration
//       ."}
```

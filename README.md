# Zappy

[![version](https://img.shields.io/badge/version-3.0.0-dodgerblue)](https://github.com/GlitchyByte/zappy/releases/tag/v3.0.0)
[![spec](https://img.shields.io/badge/spec-2.0.0-palegreen)](https://github.com/GlitchyByte/zappy/blob/v3.0.0/SPEC.md)

Library for compressing and encoding JSON payloads into Base64Url
for efficient transport.

[Read the spec here!](https://github.com/GlitchyByte/zappy/blob/v3.0.0/SPEC.md)

#### Goals

* Capable of encoding any valid utf-8 json string.
* Transportable as URL-safe plain text.
* Produce smaller encoded string than vanilla base64.
* Fast encoding and decoding.

#### Non-Goals

* Encryption. This ain't it. It's obfuscation at best.
* Compressing generic text. Though it may work, Zappy is designed for json.

#### Notes

For non-trivial json payloads, testing has shown the resulting Zappy
string is **smaller than the original** json string! This wasn't a goal,
but it is a satisfying result and worth mentioning.

Zappy strings should not be stored. They are designed for transport
where one side encodes before transmitting and the other side decodes
after receiving. If the spec changes between encoding and decoding,
the result will not be the original string.

## API

```ts
// Encode and decode a Zappy string.
function encodeStringToZappy(str: string): string
function decodeZappyToString(str: string): string

// Encode and decode a Base64Url string.
function encodeStringToBase64(str: string): string
function decodeBase64ToString(str: string): string

// Encode and decode a DeflateRaw-Base64Url string.
function encodeStringToDeflate(str: string): string
function decodeDeflateToString(str: string): string
```

## How to use

### Add package to your project

```bash
npm install @glitchybyte/zappy
```

### Encode and decode in your code

```ts
import {
  decodeZappyToString,
  encodeStringToBase64,
  zappyDefaultContractions
} from "@glitchybyte/zappy"

const json = '{' +
  '"codeUrl":"https://github.com/glitchybyte/zappy",' +
  '"msg":"When I deal with internationalization I think of defenestration."' +
  '}'
const encoded = encodeStringToZappy(json)
console.log(`[${encoded.length}] ${encoded}`)
// [118] dNCI6JqpJjK8bWS7cjew_azBuwOvlztCH6-mpWznmzhrKb5l10AKQDQoPgAa
//       XBCoA24Kh7e3aIAmcNuIXjFk4AKQDXpLESAE9GAN7BrqORuRrW4nTg52_A

// While Base64Url is:
const base64Encoded = encodeStringToBase64(json)
console.log(`[${base64Encoded.length}] ${base64Encoded}`)
// [164] eyJjb2RlVXJsIjoiaHR0cHM6Ly9naXRodWIuY29tL2dsaXRjaHlieXRlL3ph
//       cHB5IiwibXNnIjoiV2hlbiBJIGRlYWwgd2l0aCBpbnRlcm5hdGlvbmFsaXph
//       dGlvbiBJIHRoaW5rIG9mIGRlZmVuZXN0cmF0aW9uLiJ9

const decoded = decodeZappyToString(encoded)
console.log(`[${decoded.length}] ${decoded}`)
// [123] {"codeUrl":"https://github.com/glitchybyte/zappy","msg":"Whe
//       n I deal with internationalization I think of defenestration
//       ."}
```

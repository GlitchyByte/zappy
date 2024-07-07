# Zappy

![Version](https://img.shields.io/badge/Version-1.2.1-blue)
![Spec](https://img.shields.io/badge/Spec-1.1.0-cyan)

Lightweight library for compressing and encoding web-related text
(json, URLs, UUIDs, etc.) into a URL-safe format for
efficient transport.

[Read the spec here!](https://github.com/GlitchyByte/zappy/blob/main/SPEC.md)

#### Goals

* Capable of encoding any valid utf-8 string.
* Transportable as URL-safe plain text.
* Produce smaller encoded string than vanilla base64 on ASCII payloads.
* Fast encoding and decoding.

#### Non-Goals

* Encryption. This ain't it. It's obfuscation at best.

#### Notes

To fully take advantage of Zappy, you as a dev should provide
`contraction tables` specialized to your payloads.

Zappy strings should not be stored. They are designed for transport
where one side encodes before transmitting and the other side decodes
after receiving. If the `contraction tables` change between encoding
and decoding, it's very possible the output will not be the same or
even invalid. Keep this in mind when decoding and handle these cases
accordingly. That is, always sanitize your (decoded) output and handle
decoding error conditions.

# API

```ts
// Constructor.
Zappy(source: Map<number, string[]> | null, throwOnDecodeErrors = false)

// Base64 string encode/decode.
base64StringEncode(str: string): string
base64StringDecode(str: string): string | null

// Zappy encode/decode.
encode(str: string): string
decode(str: string): string | null
```

# How to use

### Add to your project

    npm install @glitchybyte/zappy

### Define contraction tables

There are 17 `contraction tables` available for use.

Table 0 is called the fast lookup table, it gets the best compression
gains, but only 16 entries are permitted. Entries in table 0 can have
a minimum of 2 characters (or 2 bytes when converted to UTF-8) and
still have a gain.

Tables 1-17 allow 256 entries each. Entries can have a minimum of 3
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
    "defenestration",
    "internationalization"
  ]]
])
```

### Encode and decode

```ts
const zappy = new Zappy(contractions)
const json = '{' +
  '"codeUrl":"https://github.com/glitchybyte/zappy",' +
  '"msg":"When I deal with internationalization I think of defenestration."' +
  '}'
const encoded = zappy.encode(json)
console.log(`[${encoded.length}] ${encoded}`)
//  [90] 6mNvZGVVcmzm4GdpdGh1Yv8EL_ACL3phcHB5521zZ-ZXaGVuIEkgZGVhbCB3
//       aXRoIPAAIEkgdGhpbmsgb2Yg8AEu6w

// While vanilla base64 is:
const base64Encoded = zappy.base64StringEncode(json)
console.log(`[${base64Encoded.length}] ${base64Encoded}`)
// [164] eyJjb2RlVXJsIjoiaHR0cHM6Ly9naXRodWIuY29tL2dsaXRjaHlieXRlL3ph
//       cHB5IiwibXNnIjoiV2hlbiBJIGRlYWwgd2l0aCBpbnRlcm5hdGlvbmFsaXph
//       dGlvbiBJIHRoaW5rIG9mIGRlZmVuZXN0cmF0aW9uLiJ9

const decoded = zappy.decode(encoded)!
console.log(`[${decoded.length}] ${decoded}`)
// [123] {"codeUrl":"https://github.com/glitchybyte/zappy","msg":"Whe
//       n I deal with internationalization I think of defenestration
//       ."}
```

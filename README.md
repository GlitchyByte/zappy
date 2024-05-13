# Zappy

![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Spec](https://img.shields.io/badge/Spec-1.0.0-cyan)

Lightweight library for compressing and encoding web-related text
(json, urls, etc.) into a URL-safe format for efficient transport.

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

[Read the spec here.](https://github.com/glitchybyte/zappy/SPEC.md)

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

Developer defined contraction tables are overlaid onto
[default tables](https://github.com/glitchybyte/zappy/src/main/zappy-default-contractions.ts). 
There is a default table 0 specialized in json, and a default 
table 16 with common strings.

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
// [92] 6mNvZGVVcmzm4GdpdGh1Yv8EL_ACL3R3YWRkbGXnbXNn5ldoZW4gSSBkZWFs
//      IHdpdGgg8AAgSSB0aGluayBvZiDwAS7r

// While vanilla base64 is:
// [167] eyJjb2RlVXJsIjoiaHR0cHM6Ly9naXRodWIuY29tL2dsaXRjaHlieXRlL3R3
//       YWRkbGUiLCJtc2ciOiJXaGVuIEkgZGVhbCB3aXRoIGludGVybmF0aW9uYWxp
//       emF0aW9uIEkgdGhpbmsgb2YgZGVmZW5lc3RyYXRpb24uIn0

const decoded = zappy.decode(encoded)
console.log(`[${decoded.length}] ${decoded}`)
// [125] {"codeUrl":"https://github.com/glitchybyte/zappy","msg":"W
//       hen I deal with internationalization I think of defenestrati
//       on."}
```

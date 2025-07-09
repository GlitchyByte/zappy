# Spec for nerds

![spec](https://img.shields.io/badge/spec-2.0.0-palegreen)

### Level 1 instruction

#### 1 bit

* 0: Default lookup table<sup>1</sup>. Septet follows.
* 1: Level 2 instruction. ↓

### Level 2 instruction

#### 2 bits

* 00: Repeat. Take 4 bits [0-15 + 1] as repeat count. Take the next septet, get its default lookup, and repeat it.
* 01: Zappy phrase (uppercase). Take 5 bits [0-31 + 1] as bit `count`.
  Take `count` bits, and convert this value to an uppercase Zappy string<sup>2</sup>.
* 10: Zappy phrase (lowercase). Take 5 bits [0-31 + 1] as bit `count`.
  Take `count` bits, and convert this value to a lowercase Zappy string<sup>2</sup>.
* 11: Level 3 instruction. ↓

### Level 3 instruction

#### 2 bits

* 00: Decimal integer. Take 5 bits [0-31 + 1] as bit `count`.
  Take `count` bits, and convert this value to a decimal string.
* 01: Hexadecimal integer (uppercase). Take 5 bits [0-31 + 1] as `count`.
  Take `count` bits, and convert this value to an uppercase hexadecimal string.
* 10: Hexadecimal integer (lowercase). Take 5 bits [0-31 + 1] as `count`.
  Take `count` bits, and convert this value to a lowercase hexadecimal string.
* 11: Level 4 instruction. ↓

### Level 4 instruction

#### 1 bit

* 0: Blob<sup>3</sup>. Take 4 bits [0-15 + 1] as byte `count`.
  Take next `count` bytes as-is.
* 1: Level 5 instruction. ↓

### Level 5 instruction

#### 1 bit

* 0: [NOT IMPLEMENTED YET. This will be included in next version] Known string lookup. Take 6 bits [0-63] as index in known string array, if given.
* 1: End of data.

---

<sup>1</sup> Default lookup septet (7 bits):

* 0-94  -> 32-126 ASCII (95 characters)
* 95-127 -> json common contractions (33 contractions)

<sup>2</sup> Zappy strings are base27 strings with a "0" as zero,
and then using English alphabet from "a" to "z" (or "A" to "Z").
It compresses all groups of letters of up to length 6,
and some of length 7, to a number that fits in 32 bits.

<sup>3</sup> Blobs are not compressed and, in fact, use 10 extra bits.
They are used mainly for UTF-8 multibyte sequences. The encoder will
group consecutive multibyte sequences together though, using only 10
extra bits for the whole group.

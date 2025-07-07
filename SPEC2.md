# Spec for nerds

![spec](https://img.shields.io/badge/spec-2.0.0-palegreen)

## Each byte:

    7 6 5 4 3 2 1 0
    | | | | | | | |
    | | | | | | | \_ bit 0
    | | | | | | \_ bit 1
    | | | | | \_ bit 2
    | | | | \_ bit 3
    | | | \_ bit 4
    | | \_ bit 5
    | \_ bit 6
    \_ bit 7

Default lookup 7 bits (septet) each:

 0-94  -> 32-126 ASCII (95 characters)
95-127 -> json commons (33 contractions)

### Level 1 instruction

#### 1 bit

* 0: Default lookup table. Septet follows.
* 1: Level 2 instruction. ↓

### Level 2 instruction

#### 2 bits

* 00: Repeat. Take 4 bits [15 + 1] as repeat count.
  Take the next septet, get its default lookup, and repeat it.
* 01: Zappy phrase (uppercase). ↓
* 10: Zappy phrase (lowercase). ↓
* 11: Level 3 instruction. ↓

### Level 3 instruction

#### 2 bits

* 00: Decimal integer. ↓
* 01: Hexadecimal integer (uppercase). ↓
* 10: Hexadecimal integer (lowercase). ↓
* 11: Level 4 instruction. ↓

### Level 4 instruction

#### 1 bit

* 0: Blob<sup>1</sup>. Take 4 bits [15 + 1] as byte `count`.
  Take next `count` bytes as-is.
* 1: End of data.

### Decimal integer

#### 1 bit

* 0: Decimal integer. ↓
* 1: Hexadecimal integer. ↓

### Decimal integer

#### 2 bits

* 00: UInt8 
* 01: UInt16 
* 10: UInt32<sup>2</sup>
* 11: *Unused*


    // 4 + 2 + 8 = 14 ~10-255 [16-24]
    // 4 + 2 + 16 = 22 ~256-65535 [24-40]
    // 4 + 2 + 24 = 30 ~65536-16777215 [40-64]
    // 4 + 2 + 32 = 38 ~16777216-4294967295 [64-80]

    // 4 + 5 + '4-32' = 12-41 ~10-4294967295 [16-80]
    // 4 + 5 + 4 = 13 ~10-15 [16-16]
    // 4 + 5 + 5 = 14 ~16-31 [16-16]
    // 4 + 5 + 6 = 15 ~32-63 [16-16]
    // 4 + 5 + 7 = 16 ~64-127 [16-24]
    // 4 + 5 + 8 = 17 ~128-255 [24-24]
    // 4 + 5 + 9 = 18 ~256-511 [24-24]
    // 4 + 5 + 10 = 19 ~512-1023 [24-32]
    // 4 + 5 + 11 = 20 ~1024-2047 [32-32]

    // 4 + 1 + 5 + '4-32' = 14-42 ~0x10-0xffff_ffff [16-64]
    // 4 + 1 + 5 + 4 = 14 ~0x10-0x3fff [16-32]
    // 4 + 1 + 5 + 5 = 15 ~0x4000-0x7fff [32-32]
    // 4 + 1 + 5 + 6 = 16 ~0x8000-0xffff [32-32]
    // 4 + 1 + 5 + 7 = 17 ~0x1_0000-0x1_ffff [40-40]
    // 4 + 1 + 5 + 8 = 18 ~0x2_0000-0x3_ffff [40-40]
    // 4 + 1 + 5 + 32 = 42 ~0x8000_0000-0xffff_ffff [64-64]

Then, take appropriate number of bytes.

### Hexadecimal integer

#### 1 bit

* 0: Uppercase
* 1: Lowercase

#### 1 bit

* 0: UInt16
* 1: UInt32<sup>2</sup>

Then, take appropriate number of bytes.

---

### Contraction lookup:

#### bit 4

* 0: Fast lookup! Take remainder bits (0-3) as index on table 0.
* 1: Table lookup. Take remainder bits (0-3) as table id, and next byte
  as index on that table.

<sup>1</sup> Blobs are not compressed and, in fact, use an extra byte.
They are used mainly for UTF-8 multibyte sequences. The encoder will
group consecutive multibyte sequences together though.

<sup>2</sup> All UInt storage references are little-endian. Because of
a JavaScript limitation, UIn32 in this implementation only uses 31 bits.
This has no effect in the actual compressing capabilities, just that in
theory it could compress more.

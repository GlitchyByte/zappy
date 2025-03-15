# Spec for nerds

![spec](https://img.shields.io/badge/spec-1.1.0-palegreen)

## Each byte:

#### bit 7

* 0: Take this byte as ASCII.
* 1: This is a compressed instruction. ↓

### Compressed instruction:

#### bit 6

* 0: This is a level 1 compressed instruction. ↓
* 1: This is a level 2 compressed instruction. ↓

### Level 1 compressed instruction:

#### bit 5

* 0: Blob<sup>1</sup>. Take remainder bits (0-4) as byte `count`. Take
  next `count` bytes as-is.
* 1: Repeat. Take remainder bits (0-4) as repeat count. Take the next
  byte as-is is and repeat it.

### Level 2 compressed instruction:

#### bit 5

* 0: Unsigned integer. ↓
* 1: Contraction lookup. ↓

### Unsigned integer:

#### bit4

* 0: Decimal integer. Take remainder bits (0-3) as byte count (only 1,
  2, and 4 are valid values). Take next bytes as UInt8, UInt16, or
  UInt32<sup>2</sup>.
* 1: Hexadecimal integer. ↓

### Hexadecimal integer:

#### bit 3

* 0: Uppercase hexadecimal integer. Take remainder bits (0-2) as byte
  count (only 2 and 4 are valid values). Take next bytes as UInt16 or
  UInt32<sup>2</sup>.
* 1: Lowercase hexadecimal integer. Take remainder bits (0-2) as byte
  count (only 2 and 4 are valid values). Take next bytes as UInt16 or
  UInt32<sup>2</sup>.

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

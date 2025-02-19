var bzip2 = {}; // An object `bzip2` to contain the decompression functions.

/**
 * Converts a byte array into a function that allows bitwise reading.
 * This function acts as a bitstream reader that extracts `n` bits from the byte array.
 *
 * @param {Uint8Array} bytes - The compressed byte array.
 * @returns {Function} - A function that reads `n` bits from the byte array.
 **/
bzip2.array = function (bytes) {
  let bit = 0; // Variable to track the current bit position.
  let byte = 0; // Variable to track the current byte position.
  let BITMASK = [0, 0x01, 0x03, 0x07, 0x0f, 0x1f, 0x3f, 0x7f, 0xff]; // Array for masking bits.

  // This function returns the next `n` bits from the byte stream as a number.
  return function (n) {
    let result = 0; // Initialize result to store the bits we read.

    while (n > 0) {
      // Loop until we read the required number of bits.
      var left = 8 - bit; // Calculate how many bits are left in the current byte.

      // If the remaining bits to read are greater than or equal to the bits left in the byte.
      if (n >= left) {
        result <<= left; // Shift the result to the left.
        result |= BITMASK[left] & bytes[byte++]; // Read the bits and add them to result.
        bit = 0; // Reset the bit counter.
        n -= left; // Subtract the number of bits we've read from `n`.
      } else {
        // If we need to read less than what is available in the current byte.
        result <<= n; // Shift the result left by `n` bits.
        result |=
          (bytes[byte] & (BITMASK[n] << (8 - n - bit))) >> (8 - n - bit); // Add the bits to the result.
        bit += n; // Update the bit position.
        n = 0; // All bits are read.
      }
    }

    return result; // Return the resulting value after reading the bits.
  };
};

/**
 * Simple decompression function that reads the BZip2 header and decompresses the entire payload.
 *
 * @param {Function} bits - A function that allows reading bits from the byte array.
 * @returns {Uint8Array} - The fully decompressed byte array.
 **/
bzip2.simple = function (bits) {
  let size = bzip2.header(bits); // Read the header and get the block size.
  let all = []; // Array to accumulate decompressed data.
  let chunk = []; // Temporary array to store each chunk of decompressed data.

  // Decompress the data in chunks until no more data is left.
  while (chunk != -1) {
    all = all.concat(chunk); // Concatenate the current chunk to the full output.
    chunk = bzip2.decompress(bits, size); // Get the next chunk of decompressed data.
  }

  // Return the decompressed data as a Uint8Array.
  return Uint8Array.from(all);
};

/**
 * Reads and validates the BZip2 header.
 *
 * @param {Function} bits - A function that allows reading bits from the byte array.
 * @returns {number} - The BZip2 block size (1-9).
 * @throws {string} - If the magic number is incorrect or the archive is invalid.
 **/
bzip2.header = function (bits) {
  // Check for the bzip2 magic number (4348520 in decimal)
  // Throw an error if the magic number is not found
  if (bits(8 * 3) != 4348520) throw "No magic number found.";

  // Read the block size (0-9), subtracting 48 to convert to an integer,
  // then perform a check for the block size, and Throw an error if the
  // block size is invalid.
  var i = bits(8) - 48;
  if (i < 1 || i > 9) throw "Not a bzip2 archive.";

  // Return the block size.
  return i;
};

/**
 * Decompresses a BZip2 compressed block using Huffman coding and Move-To-Front (MTF) transform.
 *
 * @param {Function} bits - a function for reading the block data (starting with 0x314159265359)
 * @param {number} size - block size (0-9) (optional, defaults to 9)
 * @param {number} [len] - length at which to stop decompressing and return the output
 * @returns {Array|number} - The decompressed data or `-1` if the last block is reached.
 * @throws {string} - Various errors if decompression encounters unexpected data.
 **/
bzip2.decompress = function (bits, size, len) {
  var MAX_HUFCODE_BITS = 20; // Maximum number of bits used in Huffman codes.
  var MAX_SYMBOLS = 258; // Maximum number of symbols in a block.
  var SYMBOL_RUNA = 0; // Symbol representing run A.
  var SYMBOL_RUNB = 1; // Symbol representing run B.
  var GROUP_SIZE = 50; // Size of each group.
  var bufsize = 100000 * size; // Size of the buffer for decompressed data.

  // Read and store the first 6 bytes of the block.
  for (var h = "", i = 0; i < 6; i++) h += bits(8).toString(16);

  // Check for the magic number indicating the end of the data block.
  if (h == "177245385090") return -1; // Last block.
  if (h != "314159265359") throw "Not valid bzip2 data."; // Invalid data.

  bits(32); // Skip the CRC codes (32 bits).
  if (bits(1)) throw "Unsupported obsolete version."; // Check for unsupported version.

  var origPtr = bits(24); // Read the original pointer (position in the decompressed data).
  if (origPtr > bufsize) throw "Initial position larger than buffer size."; // Check for invalid pointer.

  var t = bits(16); // Read the number of symbols.
  var symToByte = new Uint8Array(256); // Array to map symbols to bytes.
  var symTotal = 0; // Total number of symbols.

  // Generate the symbol-to-byte mapping based on the Huffman tree.
  for (i = 0; i < 16; i++) {
    if (t & (1 << (15 - i))) {
      var k = bits(16); // Read the symbol frequency.
      for (j = 0; j < 16; j++) {
        if (k & (1 << (15 - j))) symToByte[symTotal++] = 16 * i + j;
      }
    }
  }

  var groupCount = bits(3); // Read the number of groups.
  if (groupCount < 2 || groupCount > 6) throw "Error 1 while decompressing."; // Check for valid group count.

  var nSelectors = bits(15); // Read the number of selectors.
  if (nSelectors == 0) throw "Error 2 while decompressing."; // Invalid selector count.

  var mtfSymbol = []; // Array for storing the MTF (Move-To-Front) symbol.
  for (var i = 0; i < groupCount; i++) mtfSymbol[i] = i; // Initialize the MTF symbol array.

  var selectors = new Uint8Array(32768); // Array to store the selectors.
  for (var i = 0; i < nSelectors; i++) {
    for (var j = 0; bits(1); j++)
      if (j >= groupCount) throw "Error 3 while decompressing."; // Check for valid selector index.

    var uc = mtfSymbol[j]; // Get the symbol for the selector.
    mtfSymbol.splice(j, 1); // Remove the symbol from the MTF array.
    mtfSymbol.splice(0, 0, uc); // Insert the symbol at the front of the MTF array.
    selectors[i] = uc; // Assign the selector.
  }

  var symCount = symTotal + 2; // Total number of symbols (including run symbols).
  var groups = []; // Array to store the groups.

  // Process each group.
  for (var j = 0; j < groupCount; j++) {
    var length = new Uint8Array(MAX_SYMBOLS); // Array to store symbol lengths.
    var temp = new Uint8Array(MAX_HUFCODE_BITS + 1); // Temporary array for storing counts of code lengths.
    t = bits(5); // Read the code length.

    // Generate the lengths for each symbol in the group.
    for (var i = 0; i < symCount; i++) {
      while (true) {
        if (t < 1 || t > MAX_HUFCODE_BITS) throw "Error 4 while decompressing."; // Check for valid code length.

        if (!bits(1)) break; // Break on invalid bit.
        if (!bits(1)) t++;
        // Increase code length.
        else t--; // Decrease code length.
      }
      length[i] = t; // Store the code length.
    }

    // Find the minimum and maximum code lengths.
    var minLen = length[0];
    var maxLen = length[0];
    for (var i = 1; i < symCount; i++) {
      if (length[i] > maxLen) maxLen = length[i];
      else if (length[i] < minLen) minLen = length[i];
    }

    var hufGroup = (groups[j] = {}); // Initialize a group for the Huffman tree.
    hufGroup.permute = new Uint32Array(MAX_SYMBOLS); // Array to store the permuted symbols.
    hufGroup.limit = new Uint32Array(MAX_HUFCODE_BITS + 1); // Array for code length limits.
    hufGroup.base = new Uint32Array(MAX_HUFCODE_BITS + 1); // Array for base values of code lengths.
    hufGroup.minLen = minLen; // Store the minimum code length.
    hufGroup.maxLen = maxLen; // Store the maximum code length.

    // Initialize the base and limit arrays for the group.
    var base = hufGroup.base.subarray(1);
    var limit = hufGroup.limit.subarray(1);
    var pp = 0;
    for (var i = minLen; i <= maxLen; i++)
      for (var t = 0; t < symCount; t++)
        if (length[t] == i) hufGroup.permute[pp++] = t;

    for (i = minLen; i <= maxLen; i++) temp[i] = limit[i] = 0;
    for (i = 0; i < symCount; i++) temp[length[i]]++;
    pp = t = 0;
    for (i = minLen; i < maxLen; i++) {
      pp += temp[i];
      limit[i] = pp - 1;
      pp <<= 1;
      base[i + 1] = pp - (t += temp[i]);
    }
    limit[maxLen] = pp + temp[maxLen] - 1;
    base[minLen] = 0;
  }

  var byteCount = new Uint32Array(256);
  for (var i = 0; i < 256; i++) mtfSymbol[i] = i;

  var runPos = 0;
  var count = 0;
  var symCount = 0;
  var selector = 0;
  var buf = new Uint32Array(bufsize);
  while (true) {
    if (!symCount--) {
      symCount = GROUP_SIZE - 1;
      if (selector >= nSelectors) throw "Error 5 while decompressing.";
      hufGroup = groups[selectors[selector++]];
      base = hufGroup.base.subarray(1);
      limit = hufGroup.limit.subarray(1);
    }
    i = hufGroup.minLen;
    j = bits(i);
    while (true) {
      if (i > hufGroup.maxLen) throw "Error 6 while decompressing.";
      if (j <= limit[i]) break;
      i++;
      j = (j << 1) | bits(1);
    }
    j -= base[i];
    if (j < 0 || j >= MAX_SYMBOLS) throw "Error 7 while decompressing.";
    var nextSym = hufGroup.permute[j];
    if (nextSym == SYMBOL_RUNA || nextSym == SYMBOL_RUNB) {
      if (!runPos) {
        runPos = 1;
        t = 0;
      }
      if (nextSym == SYMBOL_RUNA) t += runPos;
      else t += 2 * runPos;
      runPos <<= 1;
      continue;
    }
    if (runPos) {
      runPos = 0;
      if (count + t >= bufsize) throw "Error 8 while decompressing.";
      uc = symToByte[mtfSymbol[0]];
      byteCount[uc] += t;
      while (t--) buf[count++] = uc;
    }
    if (nextSym > symTotal) break;
    if (count >= bufsize) throw "Error 9 while decompressing.";
    i = nextSym - 1;
    uc = mtfSymbol[i];
    mtfSymbol.splice(i, 1);
    mtfSymbol.splice(0, 0, uc);
    uc = symToByte[uc];
    byteCount[uc]++;
    buf[count++] = uc;
  }
  if (origPtr < 0 || origPtr >= count) throw "Error 10 while decompressing.";
  var j = 0;
  for (var i = 0; i < 256; i++) {
    k = j + byteCount[i];
    byteCount[i] = j;
    j = k;
  }
  for (var i = 0; i < count; i++) {
    uc = buf[i] & 0xff;
    buf[byteCount[uc]] |= i << 8;
    byteCount[uc]++;
  }
  var pos = 0;
  var current = 0;
  var run = 0;
  if (count) {
    pos = buf[origPtr];
    current = pos & 0xff;
    pos >>= 8;
    run = -1;
  }
  count = count;
  var output = [];
  var copies;
  var previous;
  var outbyte;
  if (!len) len = Infinity;
  while (count) {
    count--;
    previous = current;
    pos = buf[pos];
    current = pos & 0xff;
    pos >>= 8;
    if (run++ == 3) {
      copies = current;
      outbyte = previous;
      current = -1;
    } else {
      copies = 1;
      outbyte = current;
    }
    while (copies--) {
      output.push(outbyte);
      if (!--len) return output;
    }
    if (current != previous) run = 0;
  }
  return output;
};

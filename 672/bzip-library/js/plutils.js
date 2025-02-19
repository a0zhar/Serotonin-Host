function helperGetCompressedAndDecompressedBlob(fileName) {
    let array; // TODO: Comment
    let decompressed_pl_blob; // TODO: Comment
    let compressed_pl_blob; // TODO: Comment

    let xhr = new XMLHttpRequest();
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    xhr.open("GET", fileName, true); // Use async request
    xhr.onload = function () {
        if (xhr.status === 200) {
            array = Uint8Array.from(xhr.response, c => c.charCodeAt(0));
            compressed_pl_blob = new Uint32Array(array);

            document.getElementById("label0").innerHTML += ": Size " + compressed_pl_blob.length + " bytes";
            document.getElementById("compressedBlob").value = compressed_pl_blob;

            decompressed_pl_blob = bzip2.simple(bzip2.array(array));
            document.getElementById("label1").innerHTML += ": Size " + decompressed_pl_blob.length + " bytes";
            document.getElementById("deCompressedBlob").value = decompressed_pl_blob;
        }
    };
    xhr.send();
}
const IS_CURRENTLY_TESTING_ENVIRONMENT = true;
function helperGetDecompressedPayloadBlob(fileName) {
    let compressed_blob_array; // The Compressed bzip Blob Data in the form of an Array
    let raw_blob_array; // Decompressed Version of the Blob given in Response
    let raw_blob_len; // Length of the Blob

    // Initialize variables for the local HTTP Request for our Payload Binary File
    let xhr = new XMLHttpRequest();
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    xhr.open("GET", fileName, true); // Use async request
    xhr.onload = function () {
        if (xhr.status === 200) {
            // Convert the response to a Uint8Array
            compressed_blob_array = Uint8Array.from(xhr.response,
                c => c.charCodeAt(0));

            // Decompress the blob response
            raw_blob_array = bzip2.simple(bzip2.array(compressed_blob_array));

            // Get the length of the blob
            blob_len = raw_blob_array.length;

            if (!IS_CURRENTLY_TESTING_ENVIRONMENT) {
                return [raw_blob_array, blob_len];
            } else {
                // Show information about the fetched payload binary file
                document.getElementById("label0").innerHTML += ": Size " + compressed_blob_array.length + " bytes";
                document.getElementById("compressedBlob").value = compressed_blob_array;
                document.getElementById("label1").innerHTML += ": Size " + blob_len + " bytes";
                document.getElementById("deCompressedBlob").value = raw_blob_array;
            }
        }
    };
    xhr.send();
}
function test_decompress() {
    try {
        helperGetDecompressedPayloadBlob("./payload.bin.bz2");

    } catch (e) {
        alert(e);
    }
}

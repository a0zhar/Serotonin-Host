// Once the page has loaded, exploit executed, we dynamically add the event
document.addEventListener("DOMContentLoaded", function () {
    if (!localStorage.passcount) localStorage.passcount = 0;
    document.getElementById("passCounter").innerHTML = localStorage.passcount;
    if (!localStorage.failcount) localStorage.failcount = 0;
    document.getElementById("failCounter").innerHTML = localStorage.failcount;

    let hen_goldhen_btns = document.querySelectorAll("button[data-hen-pl]");
    let regular_pl_btns = document.querySelectorAll("button[data-pl]");
    let mira_btn = document.querySelectorAll("button[data-mira-pl]");
    let btns_info = document.querySelectorAll("button[data-pl-info]");

    // Dynamically add the mouseover and mouseout events to our button elements
    // allowing for showing information about the payloads
    btns_info.forEach(element => {
        element.setAttribute("onMouseOut", "msgs2.innerHTML = 'Status'");
        element.setAttribute(
            "onMouseOver",
            `msgs2.innerHTML = '${element.getAttribute("data-pl-info")}'`
        );
    });

    // Dynamically add the onclick mouseout events to our button elements
    // allowing for loading goldhen or regular hen payloads
    hen_goldhen_btns.forEach(element => {
        if (!element.getAttribute("onclick"))
            element.setAttribute(
                "onclick",
                `load_hen('${element.getAttribute("data-hen-pl")}')`
            );
    });

    // Dynamically add the onclick mouseout events to our button elements
    // allowing for loading mira payload
    mira_btn.forEach(element => {
        if (!element.getAttribute("onclick"))
            element.setAttribute(
                "onclick",
                `load_mira('${element.getAttribute("data-mira-pl")}')`
            );
    });

    // Dynamically add the onclick mouseout events to our button elements
    // allowing for loading regular payloads
    regular_pl_btns.forEach(element => {
        if (!element.getAttribute("onclick"))
            element.setAttribute(
                "onclick",
                `load_Pl('${element.getAttribute("data-pl")}')`
            );
    });


    function showdate() {
        var dt = new Date();
        var Hour = dt.getHours();
        var Minute = dt.getMinutes();
        var Day = dt.getDate();
        var Month = dt.getMonth() + 1;
        var Year = dt.getFullYear();

        if (Minute < 10) { Minute = "0" + Minute; }
        if (Hour < 10) { Hour = "0" + Hour; }

        var dateElement = document.getElementById("date");
        var clockElement = document.getElementById("clock");

        if (dateElement && clockElement) { // Ensure elements exist
            dateElement.innerHTML = Day + "/" + Month + "/" + Year;
            clockElement.innerHTML = Hour + ":" + Minute;
        }
    }

    // Run once immediately to prevent delay
    showdate();

    // Update every second
    setInterval(showdate, 1000);
});


const BIN_FILES_FOLDER = "./payloads";
let status_label = document.getElementById("msgs2");
let all_area = document.getElementById("all");
let hens_area = document.getElementById("hens");
let restore_area = document.getElementById("restore");
let tools_area = document.getElementById("tools");
let dump_area = document.getElementById("dump");
let linux_area = document.getElementById("linux");
let gtav_area = document.getElementById("gtav");

function loadFile(fileName) {
    try {
        if (fileName.endsWith(".bz2")) {
            let xhr = new XMLHttpRequest();
            xhr.overrideMimeType("text/plain; charset=x-user-defined");
            xhr.open("GET", `${BIN_FILES_FOLDER}/${fileName}`, false);
            xhr.send();

            if (xhr.status === 200) {
                // Convert the response to a Uint8Array
                let array = Uint8Array.from(xhr.response,
                    c => c.charCodeAt(0));

                // Then Decompress the blob response and return it
                return bzip2.simple(bzip2.array(array));
            } else {
                throw new Error(`Failed to load file: ${fileName}`);
            }

        }
    } catch (error) {
        alert(`${fileName}: "${error}"\n`);
        throw error;
    }
}

function cleanup_exploit_loader(loader_path = "exp_loader.js") {
    // Prevent Duplicates of the exploit loader script
    let loaderScriptID = loader_path.split(".js")[0] + "_script";
    let formerExploitLoader = document.getElementById(loaderScriptID);
    let headElement = document.getElementsByTagName("head")[0];
    if (formerExploitLoader)
        if (headElement.contains(formerExploitLoader))
            headElement.removeChild(formerExploitLoader);

}
function load_exploit_loader_script(payload_blob_array = null, loader_path = "exp_loader.js") {
    // if the user has provided a uint8array of the requested payload file,
    if (payload_blob_array != null) {
        // Prepare the window global variables, accessed by netcat.c as following:
        // __builtin_gadget_addr("$(window.mira_blob_2_len||0)"); 
        // __builtin_gadget_addr("$(window.mira_blob_2||0)"); 
        window.mira_blob_2_len = payload_blob_array.length;
        window.mira_blob_2 = malloc(window.mira_blob_2_len);
        write_mem(window.mira_blob_2, payload_blob_array);
    }

    // Create new Script Element for our Exploit Loader
    // Then Add the new script element to our head tag
    let script = document.createElement("script");
    script.src = "js/" + loader_path;
    script.id = loader_path.split(".js")[0] + "_script";
    document.getElementsByTagName("head")[0].appendChild(script);
}
function load_hen(x) {
    status_label.innerHTML = "GoldHEN Loading... please wait";
    LoadedMSG = "GoldHen Loaded!";
    cleanup_exploit_loader();
    setTimeout(function () {
        let payload = loadFile(x);
        if (!payload) return;
        load_exploit_loader_script(payload);
    }, 1000);
    setTimeout(jailbreak, 500);
}

function load_mira(x) {
    status_label.innerHTML = "Mira Loading... please wait";
    LoadedMSG = "Mira Loaded!";
    cleanup_exploit_loader();
    setTimeout(function () {
        let payload = loadFile(x);
        if (!payload) return;
        load_exploit_loader_script(payload);
    }, 1000);
    setTimeout(jailbreak, 500);
}

function load_Pl(x) {
    status_label.innerHTML = "Payload loading... please wait";
    LoadedMSG = "Payload Loaded!";
    cleanup_exploit_loader();
    setTimeout(function () {
        let payload = loadFile(x);
        if (!payload) return;
        load_exploit_loader_script(payload);
    }, 1000);
}



function load_binloader() {
    status_label.innerHTML = "Binloader loading... please wait";
    LoadedMSG = "Binloader Loaded!";
    cleanup_exploit_loader();
    load_exploit_loader_script(null);
}

function load_SPF() {
    status_label.innerHTML = "<div>Loading Firmware Spoof ...</div>";
    fw1 = parseInt(fws1.value, 16);
    fw2 = parseInt(fws2.value, 16);
    spoof();
    cleanup_exploit_loader();
    load_exploit_loader_script(null);
}

function load_fanthresh() {
    status_label.innerHTML = "<div>Loading Fan Threshold ...</div>";
    fanTemp = tempC.value;
    fan();
    cleanup_exploit_loader();
    load_exploit_loader_script(null);
}

function load_web() {
    MyItems_area.style.display = "none";
    status_label.innerHTML = "<div>Loading Web activator. Please wait ...</div>";
    cleanup_exploit_loader("payload.js");
    cleanup_exploit_loader();
    load_exploit_loader_script(null, "payload.js");
    load_exploit_loader_script(null);
}

function preweb() {
    cleanup_exploit_loader("frontend.js");
    load_exploit_loader_script(null, "frontend.js");
}

/**
 * Hides all content areas except the specified one.
 * @param {HTMLElement} areaToShow - The section to display.
 */
function showOnly(areaToShow) {
    let areas = [
        hens_area, restore_area, tools_area, dump_area,
        linux_area, gtav_area, all_area
    ];
    // Hide all areas first
    areas.forEach(area => { area.style.display = "none"; });

    // Show the requested area
    areaToShow.style.display = "block";
}

function allhens() { showOnly(hens_area); }
function allrestore() { showOnly(restore_area); }
function alltools() { showOnly(tools_area); }
function alldump() { showOnly(dump_area); }
function alllinux() { showOnly(linux_area); }
function allmods() { showOnly(gtav_area); }
function backall() { showOnly(all_area); }
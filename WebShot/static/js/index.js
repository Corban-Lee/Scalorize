
$(document).ready(function() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
});

/**
 * Generates a random unique ID
 */
function generateUniqueId() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    return `${timestamp}-${random}`;
}

/**
 * Tests the validity of a given URL.
 * @param {string} url - The URL to validate.
 * @returns {boolean} - True if the URL is valid
 */
function validUrl(url) {
    const urlPattern = /^(https?:\/\/)?([\w.]+)\.([a-z]{2,6}\.?)(\/[\w.]*)*\/?$/i;
    return urlPattern.test(url);
}

$(document).ready(function() {

    // Load the stored or default driver
    var storedDriver = localStorage.getItem('driver');
    storedDriver = !storedDriver ? "chrome" : storedDriver;
    $(`input[name='drivers'][value='${storedDriver}']`).prop('checked', true);

    // Store the selected driver
    $("input[name='drivers']").on("click", function() {
        localStorage.setItem("driver", $(this).val());
    });
});


$("#searchForm").submit(function(event) {
    event.preventDefault();

    const address = $(this).find("#search").val();

    if (!validUrl(address)) {
        alert("Please enter a valid web address");
        return;
    }

    const browser = $("input[name='drivers']:checked").val();

    if (!browser) {
        alert("Please select a driver from the drivers dropdown");
        return;
    }

    var resolutions = $("input[name='resolutions']:checked").map(function() { return $(this).val(); }).get();

    if (!resolutions.length) {
        alert("Please select a resolution from the dropdown");
        return;
    }

    const encodedAddress = encodeURIComponent(address);
    var eventSourceUrl = `/stream-screenshots?url=${encodedAddress}&browser=${browser}`;

    resolutions.forEach((resolution) => {
        eventSourceUrl += `&resolution=${resolution}`;
    });

    const fullScreenshot = $("#option-fullScreenshot").prop("checked");
    eventSourceUrl += `&fullscreen=${fullScreenshot}`;

    const saveToDisk = $("#option-saveToDisk").prop("checked");
    eventSourceUrl += `&saveToDisk=${saveToDisk}`;

    const semaphoreLimit = $("#option-semaphoreLimit").val();
    eventSourceUrl += `&semaphoreLimit=${semaphoreLimit}`;

    var eventSource = new EventSource(eventSourceUrl);

    $(window).off("beforeunload").on("beforeunload", function() {
        return "Are you sure you want to leave this page? Your progress will be lost.";
    });

    // Disable UI
    $("#search").prop("disabled", true);
    $("#searchBtn").prop("disabled", true);
    $("input[name='drivers']").prop("disabled", true);

    $("#sidebar .dropdown-toggle:not(.collapsed)").click();
    $("#btnDrivers").prop("disabled", true);
    $("#btnResolutions").prop("disabled", true);

    // Show new task
    $("#taskToast .timer").text("0.0");
    $("#taskToast .breadcrumb").html("");
    $("#taskToast .task-domain").text(address.split("://")[1]);
    $("#taskToast .browser-icon").removeClass().addClass(`browser-icon bi bi-browser-${browser}`);
    $("#taskToast").addClass("show");

    var timer = 0.0
    var timerInterval = setInterval(() => {
        timer += 0.1;
        $("#taskToast .timer").text(timer.toFixed(1));
    }, 100);

    function cleanup() {
        eventSource.close();

        // Enable UI
        $("#search").prop("disabled", false);
        $("#searchBtn").prop("disabled", false);
        $("input[name='drivers']").prop("disabled", false);
        $("#btnDrivers").prop("disabled", false);
        $("#btnResolutions").prop("disabled", false);

        // Hide task
        $("#taskToast").removeClass("show");
        clearInterval(timerInterval);

        console.log("cleaned up [eventsource]")
    }

    var previousColumn = -1
    const maxColumns = $("#resultArea > div").length - 1;

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.complete === "true") {
            alert("complete");
            cleanup();
            return;
        }

        // const screenshotPath = data.screenshotPath;
        const imageData = data.imageData;

        // addFiletreeItem(screenshotPath.replace(/\//g, '\\'), browser, imageData);

        previousColumn ++;
        if (previousColumn > maxColumns) {
            previousColumn = 0;
        }

        const column = $("#resultArea > div").eq(previousColumn);
        // col-xxl-2 col-xl-3 col-lg-4 col-sm-6
        // data-item="${screenshotPath}" 
        // href="data:image/png;base64,${imageData}" target="_blank"
        column.append(`
            <div class="mb-4 w-100 position-relative" !important" >
                <a href="#">
                    <img src="data:image/png;base64,${imageData}" class="w-100 rounded border shadow" alt="image">
                </a>
            </div>
        `);
        // <div class="position-absolute top-0 start-0 m-3">
        //             <div class="px-3 py-2 rounded bg-body-tertiary border bg-opacity-75 mb-3">
        //                 ${screenshotPath}
        //             </div>
        //             <div class="px-3 py-2 rounded bg-body-tertiary border bg-opacity-75 text-center" style="width: fit-content">
        //                 <i class="bi bi-browser-firefox me-2"></i>
        //                 <span class="">1920x1080</span>
        //             </div>
        //         </div>
    }

    eventSource.onerror = (event) => {
        console.log('An error occurred with the EventSource:');
        console.log('Event:', event);
        console.log('Target:', event.target);
        console.log('Message:', event.message);
        cleanup();
    }
});

function addFiletreeItem(screenshotPath, browser, imageData) {
    const pathParts = screenshotPath.split("\\").filter((part) => part !== "").splice(1);

    $("#taskToast .breadcrumb").html("");

    for (var i = 0; i < pathParts.length; i++) {
        const path = pathParts.slice(0, i + 1).join("/");
        const part = pathParts[i];

        $("#taskToast .breadcrumb").append(`<li class="breadcrumb-item">${part}</li>`);

        if ($(`li[data-path="${path}"]`).length !== 0) {
            continue;
        }

        const type = i === pathParts.length - 1 ? "file" : "folder";
        const safePath = path.replace(/[.\/]/g, '\\$&')
        const parentPath = pathParts.slice(0, i).join("/");
        const safeParentPath = parentPath.replace(/[.\/]/g, '\\$&');

        const name = type === "file" ? part.replace(".png", "") : part

        var item = {
            name: name,
            type: type,
            path: path,
            safePath: safePath,
            children: [],
            show: i === 0 ? "show" : "",
            imageData: type === "file" ? imageData : null
        }


        var parent = $(`li[data-path="${safeParentPath}"]`).length > 0 ? $(`#collapse-${safeParentPath}`) : $("#filetree > ul").first();
        showFiletreeItem(item, parent, browser)
    }
}

function showFiletreeItem(item, parent, browser) {
    if (item.type === "file") {
        const itemElement = $(`
            <li data-path="${item.path}" class="filetree-item file">
                <a href="data:image/png;base64,${item.imageData}" target="_blank">
                    <i class="bi bi-browser-${browser} me-1"></i>
                    <span>${item.name}</span>
                </a>
            </li>
        `);
        parent.prepend(itemElement); // prepend so files appear before folders
    }
    else if (item.type === "folder") {
        const itemElement = $(`
            <li data-path="${item.path}" class="filetree-item folder">
                <div data-bs-toggle="collapse" data-bs-target="#collapse-${item.path}" role="button" class="collapsed">
                    <i class="bi bi-chevron-right me-1"></i>
                    <span>${item.name}</span>
                </div>
                <ul class="collapse" id="collapse-${item.path}"></ul>
            </li>
        `)
        parent.append(itemElement);

        // Change the chevron direction on showing collapse
        itemElement.on("click", function(event) {
            const icon = $(event.currentTarget).find(".bi").first();
            const showing = $(event.currentTarget).find("div[data-bs-toggle='collapse']").first().hasClass("collapsed");

            const transform = !showing ? "rotate(90deg)" : "";
            icon.css("transform", transform);

            event.stopPropagation();
        });
    }
}

$("#btnCollapseAll").on("click", function() {

    if (!$("#filetree ul").first().html()) {
        alert("There are no files to collapse");
        return;
    }

    var $elements = $("#filetree li > div:not(.collapsed)").get().reverse()

    $elements.forEach(function(element) {
        var $elem = $(element);
        $elem.addClass("collapsed");
        $elem.click();
    });
});
  
$("#btnExpandAll").on("click", function() {

    if (!$("#filetree ul").first().html()) {
        alert("There are no files to expand");
        return;
    }

    $("#filetree li > div.collapsed").each(function(index) {
        var $elem = $(this);    
        $elem.removeClass("collapsed");
        $elem.click();
    });
});

function addResolution(width, height) {

    const resolutionString = `${width}x${height}`;
    const exists = $(`#resolutionOptions input[value=${resolutionString}]`).length > 0;

    if (exists) {
        alert("This resolution already exists");
        return;
    }

    const icon = width >= height ? "bi-pc-display-horizontal" : "bi-phone";
    
    // Spacers keep the text aligned correctly
    const widthSpacer = "&nbsp;".repeat(Math.max(0, 4 - `${width}`.length));
    const heightSpacer = "&nbsp;".repeat(Math.max(0, 4 - `${height}`.length));

    const newElement = $(`
        <div class="form-check d-flex align-items-center pb-1 ms-2">
            <input type="checkbox" id="res-${resolutionString}" class="form-check-input mb-1 fs-5" name="resolutions" value="${resolutionString}">
            <label for="res-${resolutionString}" class="form-check-label mx-3 flex-grow-1 text-center">
                ${widthSpacer}${width}
                <i class="bi bi-x ms-1"></i>
                ${heightSpacer}${height}
            </label>
            <button class="bg-body-tertiary border-0 text-body-secondary resolution-icon p-0">
                <i class="bi ${icon} fs-5"></i>
            </button>
            <button class="bg-body-tertiary border-0 text-body-secondary resolution-erase p-0" data>
                <i class="bi bi-trash3 fs-5"></i>
            </button>
        </div>
    `);

    $(newElement).find(".resolution-erase").on("click", function() {
        newElement.remove()
        updateResolutionStorage(null, resolutionString);
    });

    $("#resolutionOptions").append(newElement);

    updateResolutionStorage(resolutionString);
}

function updateResolutionStorage(newResolution=null, removeResolution=null) {
    var storageItem = localStorage.getItem("resolutions");
    if (!storageItem) {
        storageItem = "[]";
    }

    parsed = JSON.parse(storageItem);

    if (!parsed.includes(newResolution)) {
        parsed.push(newResolution);
    }
    
    const removeLocation = parsed.indexOf(removeResolution);
    if (removeLocation > -1) {
        parsed.splice(removeLocation, 1);
    }

    localStorage.setItem("resolutions", JSON.stringify(parsed));
}

$(document).ready(function() {
    var storageItem = localStorage.getItem("resolutions");
    if (!storageItem) {
        storageItem = "[]";
    }

    parsed = JSON.parse(storageItem);
    parsed.forEach((resolution) => {
        addResolution(...resolution.split("x"));
    })
});

$("#addResolutionForm").on("submit", function(event) {
    event.preventDefault();

    const width = parseInt($("#addResolutionWidth").val());
    const height = parseInt($("#addResolutionHeight").val());

    $("#addResolutionWidth").val("");
    $("#addResolutionHeight").val("");

    addResolution(width, height);
});

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

    const saveToDisk = $("#option-saveToDisk").prop("checked") === false;
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

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.complete) {
            cleanup();
            return;
        }

        const imageData = data.imageData;
        const filePath = data.filepath;
        const pageUrl = data.pageUrl;
        const pageTitle = data.pageTitle;

        createOrUpdateShelf(imageData, filePath, pageTitle, pageUrl);
        updateFileTree(pageUrl);
    }

    eventSource.onerror = (event) => {
        console.log('An error occurred with the EventSource:');
        console.log('Event:', event);
        console.log('Target:', event.target);
        console.log('Message:', event.message);
        cleanup();
    }
});

var shelves = [];

function createOrUpdateShelf(imageData, filePath, pageTitle, pageUrl) {

    var imageSrc;
    // console.log(pageUrl + " | " + imageData.length + " | " + filePath === null)
    if (imageData.length && filePath === null) {
        imageSrc = "data:image/png;base64," + imageData;
    }
    else {
        imageSrc = filePath;
    }

    const urlSchemeIndex = pageUrl.indexOf("://");
    const scheme = pageUrl.split("://")[0] + "://";
    if (urlSchemeIndex !== -1) {
        var pageUrlWithoutScheme = pageUrl.slice(urlSchemeIndex + 3)
    }
    else {
        var pageUrlWithoutScheme = pageUrl;
    }

    if (shelves.includes(pageUrl)) {
        $(`.result-shelf[data-url="${pageUrl}"] .result-images`).first().append(`
            <div class="col-xxl-2 col-xl-3 col-lg-4 col-sm-6 mb-4">
                <img class="w-100 rounded shadow" src="${imageSrc}" alt="">
            </div>
        `);
        return;
    }

    const urlParts = pageUrlWithoutScheme.split("/");

    var shelf = $(`
        <div id="${pageUrl}" class="result-shelf mx-5 d-flex pt-5" data-url="${pageUrl}">
            <div class="d-inline-block me-3">
                <a href="${pageUrl}" target="_blank" class="text-secondary fs-6">
                    <i class="bi bi-box-arrow-up-left"></i>
                </a>
            </div>
            <div class="d-inline-block">
                <h4 >${pageTitle}</h4>
                <ol class="breadcrumb text-body-secondary"></ol>
                <div class="result-images row">
                    <div class="col-xxl-2 col-xl-3 col-lg-4 col-sm-6 mb-4">
                        <img class="w-100 rounded shadow" src="${imageSrc}" alt="">
                    </div>
                </div>
            </div>
        </div>
    `);

    
    urlParts.forEach((part, index) => {
        var urlPartsClone = urlParts.slice();
        const urlSlice = urlPartsClone.splice(0, index + 1);
        const href = scheme + urlSlice.join("/")
        shelf.find(".breadcrumb").first().append(`
            <li class="breadcrumb-item">
                <a href="${href}" class="text-decoration-none text-reset" target="_blank">
                    ${part}
                </a>
            </li>
        `);
    });

    shelves.push(pageUrl);
    $("#resultArea").append(shelf)

}

function updateFileTree(pageUrl) {
    const url = new URL(pageUrl);
    const urlParts = (url.hostname + "/" + url.pathname).split("/").filter(part => part !== "");
    var parent = $("#filetree > ul").first();

    let currentPath = "";
    urlParts.forEach((part, index) => {
        var currentUrl = url.origin;
        if (index !== 0) {
            currentPath += part + "/";
            currentUrl = url.origin + "/" + currentPath
        }
        
        console.log(currentUrl + "\n" + url);

        // check if this part exists
        existingItem = $(`#filetree li[data-url="${currentUrl}"]`);
        if (existingItem.length) {

            // If we are at the end of the parts list
            if (index === urlParts.length - 1) {
                return;
            }
            parent = existingItem.find("ul").first();
            existingDropButton = existingItem.find("button").first();
            if (!existingDropButton.length) {
                const buttonElement = $(`
                    <button class="btn btn-sidebar collapsed" data-bs-toggle="collapse" data-bs-target="#collapse-${currentUrl}">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                `);
                buttonElement.on("click", function(event) {
                    const icon = $(event.currentTarget).find(".bi").first();
                    const showing = $(event.currentTarget).hasClass("collapsed");
                    const transform = !showing ? "rotate(90deg)" : "";
                    icon.css("transform", transform);
                    event.stopPropagation();
                });
                existingItem.find("div").first().prepend(buttonElement);
            }
        }
        else {
            paddingClass = !usingListView ? "ps-3" : "ps-0";

            newElement = $(`
                 <li class="filetree-item" data-url="${currentUrl}">
                    <div class="btn-group shadow-sm mb-3">
                        <a href="#${currentUrl}" class="btn btn-sidebar">
                            ${part}
                        </a>
                    </div>
                    <ul id="collapse-${currentUrl}" class="collapse ${paddingClass}">
                    </ul>
                </li>
            `);
            if (index !== urlParts.length - 1) {
                const buttonElement = $(`
                    <button class="btn btn-sidebar collapsed" data-bs-toggle="collapse" data-bs-target="#collapse-${currentUrl}">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                `);
                buttonElement.on("click", function(event) {
                    const icon = $(event.currentTarget).find(".bi").first();
                    const showing = $(event.currentTarget).hasClass("collapsed");

                    const transform = !showing ? "rotate(90deg)" : "";
                    icon.css("transform", transform);

                    event.stopPropagation();
                });
                newElement.find("div").first().prepend(buttonElement);
            }

            parent.append(newElement);
            parent = newElement.find("ul").first();
        }
    });
}

var usingListView = false;

$("#btnListView").on("click", function() {

    if (usingListView) {
        $(".filetree-item ul").removeClass("ps-0").addClass("ps-3");
        $(this).find(".bi").first().removeClass("bi-list-nested").addClass("bi-list");
    }
    else {
        $(".filetree-item ul").addClass("ps-0").removeClass("ps-3");
        $(this).find(".bi").first().addClass("bi-list-nested").removeClass("bi-list");
    }

    usingListView = !usingListView;

});

var collapsedAll = true;

$("#btnCollapseAll").on("click", function() {

    if (!collapsedAll) {
        if (!$("#filetree ul").first().html()) {
            alert("There are no files to collapse");
            return;
        }
        
        $(this).find(".bi").first().removeClass("bi-chevron-double-up").addClass("bi-chevron-double-down");
        var $elements = $("#filetree li > div > button:not(.collapsed)").get().reverse();
    
        $elements.forEach(function(element) {
            var $elem = $(element);
            $elem.addClass("collapsed");
            $elem.click();
        });
    }
    else {
        if (!$("#filetree ul").first().html()) {
            alert("There are no files to expand");
            return;
        }
    
        $(this).find(".bi").first().addClass("bi-chevron-double-up").removeClass("bi-chevron-double-down");
        $("#filetree li > div > button.collapsed").each(function(index) {
            var $elem = $(this);    
            $elem.removeClass("collapsed");
            $elem.click();
        });
    }

    collapsedAll = !collapsedAll;

});
  
$("#btnExpandAll").on("click", function() {

    if (!$("#filetree ul").first().html()) {
        alert("There are no files to expand");
        return;
    }

    $("#filetree li > div > button.collapsed").each(function(index) {
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

// $(document).ready(function() {
//     var storageItem = localStorage.getItem("resolutions");
//     if (!storageItem) {
//         storageItem = "[]";
//     }

//     parsed = JSON.parse(storageItem);
//     parsed.forEach((resolution) => {
//         addResolution(...resolution.split("x"));
//     })
// });

$("#addResolutionForm").on("submit", function(event) {
    event.preventDefault();

    const width = parseInt($("#addResolutionWidth").val());
    const height = parseInt($("#addResolutionHeight").val());

    $("#addResolutionWidth").val("");
    $("#addResolutionHeight").val("");

    addResolution(width, height);
});

$(".dropdown-menu").click(function(e){
    e.stopPropagation();
})

function disableButtonTemporarily(buttonElement, msTimeout) {
    $(buttonElement).prop("disabled", true);
    setTimeout(function() {
        $(buttonElement).prop("disabled", false);
    }, msTimeout);
}
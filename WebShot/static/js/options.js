
/**
 * Dark mode settings
 */

$(document).ready(function() {
    const useDarkMode = localStorage.getItem("option-useDarkMode");
    setDarkMode(useDarkMode === "true");
});

$("#option-useDarkMode").on("click", function() {
    const enable = $(this).prop("checked");
    localStorage.setItem("option-useDarkMode", enable);
    setDarkMode(enable);
});

function setDarkMode(enable) {
    $("#option-useDarkMode").prop("checked", enable);

    const theme = enable ? "dark" : "light"
    $(document.body).attr("data-bs-theme", theme);

    // Update the logo to match the theme
    const sidebarLogo = !enable ? logo : logoAlt;
    $("#brand img").attr("src", sidebarLogo);
}


/**
 * Concurrent Proceses Limit
 */

$(document).ready(function() {
    const semaphoreLimit = localStorage.getItem("option-semaphoreLimit");
    $("#option-semaphoreLimit").val(semaphoreLimit !== null ? semaphoreLimit : 10);
});

$("#option-semaphoreLimit").on("change", function() {
    localStorage.setItem("option-semaphoreLimit", $(this).val());
});


/**
 * Fullpage Screenshot
 */

$(document).ready(function() {
    const fullpageScreenshot = localStorage.getItem("option-fullScreenshot");
    $("#option-fullScreenshot").prop("checked", fullpageScreenshot === "true");
});

$("#option-fullScreenshot").on("click", function() {
    localStorage.setItem("option-fullScreenshot", $(this).prop("checked"));
});


/**
 * Memory Mode
 */

$(document).ready(function() {
    const saveToDisk = localStorage.getItem("option-saveToDisk");
    $("#option-saveToDisk").prop("checked", saveToDisk === "false");
});

$("#option-saveToDisk").on("click", function() {
    localStorage.setItem("option-saveToDisk", $(this).prop("checked") === false);
});


/**
 * Block Foreign Domains
 */

$(document).ready(function() {
    const allowForeignDomains = localStorage.getItem("option-allowForeignDomains");
    $("#option-allowForeignDomains").prop("checked", allowForeignDomains === "false");
});

$("#option-allowForeignDomains").on("click", function() {
    localStorage.setItem("option-allowForeignDomains", $(this).prop("checked") === false);
});


/**
 * Resolutions
 */

$("#openNewResolutionCollapse").on("click", function() {
    if ($(this).hasClass("collapsed")) {
        $(this).text("New");
    }
    else {
        $(this).text("Collapse");
    }
});


var sortCollapsed = true;
var defaultSortText = $("#openSortResolutionCollapse").text();
$("#openSortResolutionCollapse").on("click", function() {

    sortCollapsed = !sortCollapsed;

    $(".resolution-collapse").each(function() {
        const bootstrapCollapse = bootstrap.Collapse.getOrCreateInstance($(this));    
        bootstrapCollapse.toggle();
    });

    var text;

    if (!$("#resolutionDropdown ul").first().children().length) {
        text = defaultSortText;
        alert("Please add a new resolution first.");        
    }

    else if (sortCollapsed) {
        text = defaultSortText;
    }

    else {
        text = "Collapse";
    }

    $(this).text(text);
});

function addNewResolution(width, height, active) {
    const displayName = `${width}x${height}`;
    const id = `resolution_${displayName}`;
    const showClass = sortCollapsed ? "": "show";

    [width, height] = [parseInt(width), parseInt(height)];
    const iconClass = width >= height ? "bi-pc-display-horizontal" : "bi-phone";

    const resolutionContainer = $(`
        <li class="dropdown-item p-0 d-flex">
            <div class="resolution-item">
                <button class="btn">
                    <input id="${id}" type="checkbox" class="form-check-input">
                </button>
                <label for="${id}">
                    ${width}
                    <i class="bi bi-x"></i>
                    ${height}
                </label>
                <button class="btn">
                    <i class="bi ${iconClass}"></i>
                </button>
            </div>
            <div class="resolution-collapse collapse collapse-horizontal bg-body p-0 ${showClass}">
                <div class="btn-group px-2 d-flex align-items-center h-100 my-auto">
                    <button class="sort-resolution-up btn btn-sm btn-sidebar">
                        <i class="bi bi-chevron-up"></i>
                    </button>
                    <button class="sort-resolution-down btn btn-sm btn-sidebar">
                        <i class="bi bi-chevron-down"></i>
                    </button>
                    <button class="delete-resolution btn btn-sm btn-sidebar">
                        <i class="bi bi-trash2 text-danger"></i>
                    </button>
                </div>
            </div>
        </li>
    `);
    
    $("#resolutionDropdown ul").first().append(resolutionContainer);

    $(".sort-resolution-up").off("click").on("click", function() {
        const resolutionContainer = $(this).closest(".dropdown-item");
        resolutionContainer.prev().insertAfter(resolutionContainer);
    });
    
    $(".sort-resolution-down").off("click").on("click", function() {
        const resolutionContainer = $(this).closest(".dropdown-item");
        resolutionContainer.next().insertBefore(resolutionContainer);
    });

    $(".delete-resolution").off("click").on("click", function() {
        const resolutionContainer = $(this).closest(".dropdown-item");
        const [_, resolution] = resolutionContainer.find("input[type=checkbox]").attr("id").split("_");
        deleteResolution(resolution)
        resolutionContainer.remove();
    });
}

function deleteResolution(resolution) {
    var rawStorage = localStorage.getItem("resolutions");
    rawStorage = rawStorage === null ? "[]" : rawStorage;
    const parsedStorage = JSON.parse(rawStorage);

    const filteredStorage = parsedStorage.filter(item => item.resolution !== resolution)
    localStorage.setItem("resolutions", JSON.stringify(filteredStorage));
}

$("#newResolutionForm").on("submit", function(event) {
    event.preventDefault();

    const width = $("#newResolutionWidth").val();
    const height = $("#newResolutionHeight").val();
    const stringSize = `${width}x${height}`;
    $("#newResolutionWidth").val("").focus();
    $("#newResolutionHeight").val("");

    // Save it to local storage
    var rawStorage = localStorage.getItem("resolutions");
    rawStorage = rawStorage === null ? "[]" : rawStorage;
    var parsedStorage = JSON.parse(rawStorage);

    const exists = parsedStorage.some(item => item.resolution === stringSize);
    if (exists) {
        alert("This resolution already exists.");
        return;
    }

    parsedStorage.push({
        "resolution": stringSize,
        "active": false
    });

    localStorage.setItem("resolutions", JSON.stringify(parsedStorage));

    // Display the new resolution
    addNewResolution(width, height, false);
});

$(document).ready(function() {
    var rawStorage = localStorage.getItem("resolutions");
    rawStorage = rawStorage === null ? "[]" : rawStorage;
    var parsedStorage = JSON.parse(rawStorage);

    parsedStorage.forEach(function(item) {
        const [width, height] = item.resolution.split("x");
        addNewResolution(width, height, item.active === "true");
    });
});
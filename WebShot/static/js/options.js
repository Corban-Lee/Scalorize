
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
$("#openSortResolutionCollapse").on("click", function() {

    sortCollapsed = !sortCollapsed;

    $(".resolution-collapse").each(function() {
        const bootstrapCollapse = bootstrap.Collapse.getOrCreateInstance($(this));    
        bootstrapCollapse.toggle();
    });

    var text;

    if (!$("#resolutionDropdown ul").first().children().length) {
        text = "Sort";
        alert("Please add a new resolution first.");        
    }

    else if (sortCollapsed) {
        text = "Sort"
    }

    else {
        text = "Collapse";
    }

    $(this).text(text);
});

function addNewResolution(width, height) {
    const displayName = `${width}x${height}`;
    const id = `resolution_${displayName}`;
    const showClass = sortCollapsed ? "": "show";

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
                    <i class="bi bi-pc-display-horizontal"></i>
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
}

$("#createNewResolution").on("click", function() {
    const width = $("#newResolutionWidth").val()
    const height = $("#newResolutionHeight").val()
    addNewResolution(width, height);
});

$(document).on("ready", function() {

});
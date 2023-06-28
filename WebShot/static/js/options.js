
/**
 * Dark mode settings
 */

// $(document).ready(function() {
//     const useDarkMode = localStorage.getItem("option-useDarkMode");
//     setDarkMode(useDarkMode === "true");
// });

// $("#option-useDarkMode").on("click", function() {
//     const enable = $(this).prop("checked");
//     localStorage.setItem("option-useDarkMode", enable);
//     setDarkMode(enable);
// });

// function setDarkMode(enable) {
//     $("#option-useDarkMode").prop("checked", enable);

//     const theme = enable ? "dark" : "light"
//     $(document.body).attr("data-bs-theme", theme);

//     // Update the logo to match the theme
//     const sidebarLogo = !enable ? logo : logoAlt;
//     $("#brand img").attr("src", sidebarLogo);
// }


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
    disableButtonTemporarily(this, 350);

    if ($(this).hasClass("collapsed")) {
        $(this).text("New");
    }
    else {
        $(this).text("Close New");
    }
});


var sortCollapsed = true;
var defaultSortText = $("#openSortResolutionCollapse").text();
$("#openSortResolutionCollapse").on("click", function() {
    disableButtonTemporarily(this, 350);

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
        text = "Close Actions";
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
        <li class="topdrop-item">
            <button class="resolution-button btn topdrop-button cursor-default">
                <div class="resolution-area">
                    <input type="checkbox" name="resolutions" id="${id}" class="form-check-input my-auto">
                    <label for="${id}">
                        ${width}
                        <i class="bi bi-x"></i>
                        ${height}
                    </label>
                    <i class="bi ${iconClass}"></i>
                </div>
                <div class="collapse collapse-horizontal resolution-collapse ${showClass}">
                    <div class="resolution-actions btn-group btn-group-sm">
                        <span class="sort-resolution-up btn btn-sidebar">
                            <i class="bi bi-chevron-up"></i>
                        </span>
                        <span class="sort-resolution-down btn btn-sidebar">
                            <i class="bi bi-chevron-down"></i>
                        </span>
                        <span class="delete-resolution btn btn-sidebar">
                            <i class="bi bi-trash2 text-danger"></i>
                        </span>
                    </div>
                </div>
            </button>
        </li>
    `);
    
    $("#resolutionDropdown ul").first().append(resolutionContainer);

    resolutionContainer.find(".resolution-button").on("click", function(event) {
        const checkbox = $(this).find("input[type=checkbox]");
        checkbox.prop("checked", !checkbox.prop("checked"));
    });

    resolutionContainer.find(".resolution-button .resolution-actions").on("click", function(event) {
        event.stopPropagation();
    });

    resolutionContainer.find("input[type=checkbox]").on("click", function(event) {
        event.stopPropagation();
    });

    resolutionContainer.find("label").on("click", function(event) {
        event.stopPropagation();
    });

    $(".sort-resolution-up").off("click").on("click", function() {
        const resolutionContainer = $(this).closest(".topdrop-item");
        resolutionContainer.prev().insertAfter(resolutionContainer);
    });
    
    $(".sort-resolution-down").off("click").on("click", function() {
        const resolutionContainer = $(this).closest(".topdrop-item");
        resolutionContainer.next().insertBefore(resolutionContainer);
    });

    $(".delete-resolution").off("click").on("click", function() {
        const resolutionContainer = $(this).closest(".topdrop-item");
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

/**
 * Themes
 */

$(document).ready(function() {
    var theme = localStorage.getItem("theme");
    theme = theme === null ? "auto" : theme;
    $(`#themesDropdown input[value="${theme}"]`).click();
});

$("#themesDropdown input[type=radio]").change(function() {
    loadTheme(this.value);
    localStorage.setItem("theme", this.value);
});

function loadTheme(theme) {
    if (theme === "auto") {
        theme = "dark"; // temp
    }

    $(document.body).attr("data-bs-theme", theme)

    const themeIcon = $("#themesDropdown input[type=radio]:checked").data("icon-class");
    $("#currentThemeIcon").removeClass("bi-sun bi-moon-stars bi-window").addClass(themeIcon);
    

    const brandLogo = theme === "dark" ? logoAlt : logo;
    $("#brand img").attr("src", brandLogo);
}
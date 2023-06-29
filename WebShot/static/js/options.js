
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
    const checked = active ? "checked" : "";

    const widthSpacer = "&nbsp;&nbsp;".repeat(Math.max(0, 4 - `${width}`.length));
    const heightSpacer = "&nbsp;&nbsp;".repeat(Math.max(0, 4 - `${height}`.length));

    [width, height] = [parseInt(width), parseInt(height)];
    const iconClass = width >= height ? "bi-tv" : "bi-phone";

    const resolutionContainer = $(`
        <li class="topdrop-item">
            <button class="resolution-button btn topdrop-button cursor-default">
                <div class="resolution-area">
                    <input type="checkbox" name="resolutions" id="${id}" class="form-check-input my-auto" value="${displayName}" ${checked}>
                    <label for="${id}">
                        ${widthSpacer}${width}
                        <i class="bi bi-x"></i>
                        ${height}${heightSpacer}
                    </label>
                    <i class="bi ${iconClass}"></i>
                </div>
                <div class="collapse collapse-horizontal resolution-collapse ${showClass}">
                    <div class="resolution-actions">
                        <div class="btn-group btn-group-sm me-2">
                            <span class="sort-resolution-up btn btn-sidebar">
                                <i class="bi bi-chevron-up"></i>
                            </span>
                            <span class="sort-resolution-down btn btn-sidebar">
                                <i class="bi bi-chevron-down"></i>
                            </span>
                        </div>
                        <span class="delete-resolution btn btn-sm btn-sidebar">
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

    $("input[name='resolutions']").off("change").on("change", function() {
        // TODO: logic for selecting all resolutions
        $("#resolutionsAll").prop("indeterminate", true);
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

$("#sortResolutionsDesktop").on("click", function() {
    const list = $("#resolutionDropdown > ul");

    list.children("li").sort(function(first, second) {
        const firstSize = $(first).find("input[name='resolutions']").val();
        const [firstWidth, firstHeight] = firstSize.split("x");

        const secondSize = $(second).find("input[name='resolutions']").val();
        const [secondWidth, secondHeight] = secondSize.split("x");

        if (parseInt(firstHeight) <= parseInt(firstWidth)) {
            return -1;
        }
        else if (parseInt(secondHeight) <= parseInt(secondWidth)) {
            return 1;
        } 
        else {
        }
    }).appendTo(list);
});

$("#sortResolutionsMobile").on("click", function() {
    const list = $("#resolutionDropdown > ul");

    list.children("li").sort(function(first, second) {
        const firstSize = $(first).find("input[name='resolutions']").val();
        const [firstWidth, firstHeight] = firstSize.split("x");

        const secondSize = $(second).find("input[name='resolutions']").val();
        const [secondWidth, secondHeight] = secondSize.split("x");

        if (parseInt(firstHeight) > parseInt(firstWidth)) {
            return -1;
        }
        else if (parseInt(secondHeight) > parseInt(secondWidth)) {
            return 1;
        } 
        else {
            return firstSize.localeCompare(secondSize);
        }
    }).appendTo(list);
});

$("#deleteAllResolutions").click(function() {
    $(".delete-resolution").click();
});

$("#resolutionsAll").on("click", function() {
    const checked = $(this).prop("checked");
    $("input[name='resolutions']").each(function() {
        $(this).prop("checked", checked);
    });
});


/**
 * Themes
 */

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
    $("#currentThemeIcon").removeClass("bi-sun-fill bi-moon-stars-fill bi-circle-half").addClass(themeIcon);
    

    const brandLogo = theme === "dark" ? logoAlt : logo;
    $("#brand img").attr("src", brandLogo);
}

$(document).ready(function() {
    var theme = localStorage.getItem("theme");
    theme = theme === null ? "auto" : theme;
    $(`#themesDropdown input[value="${theme}"]`).click().change();
});


/**
 * Web Driver
 */

$("#webDriversDropdown input[type=radio]").change(function() {
    const driverIcon = $("#webDriversDropdown input[type=radio]:checked").data("icon-class");
    $("#currentWebDriverIcon").removeClass("bi-browser-chrome bi-browser-firefox bi-browser-safari").addClass(driverIcon);
    localStorage.setItem("driver", this.value);
});

$(document).ready(function() {
    var driver = localStorage.getItem("driver");
    driver = driver === null ? "chrome" : driver;
    $(`#webDriversDropdown input[value="${driver}"]`).click().change();
});

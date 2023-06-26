
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

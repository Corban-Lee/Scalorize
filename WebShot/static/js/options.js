
/**
 * Dark mode settings
 */

$(document).ready(function() {
    var useDarkMode = localStorage.getItem("option-useDarkMode");
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

$(document).ready(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

    const previousTheme = localStorage.getItem("theme");
    if (previousTheme) {
        loadTheme(previousTheme)
    }
});

$("#searchForm").submit(function(e) {
    e.preventDefault(); 

    const url = $(this).find("input[type=search]").val();

    if (!validUrl(url)) {
        alert(`Invalid URL "${url}"`);
        return;
    }

    alert("searching");

    var eventSource = new EventSource("/stream-screenshots?url=" + encodeURIComponent(url));
    eventSource.onmessage = function(event) {
        const screenshotPath = event.data;
        $("#outputRow").append(`
            <div class="col-md-3 mb-4">
                <a type="button" href="${screenshotPath}" target="_blank">
                    <img src="${screenshotPath}" class="w-100 rounded shadow"/>
                </a>
            </div>
        `);
    }
    eventSource.onerror = function() {
        console.error("An error occured while trying to connect [eventsource]");
        eventSource.close();
    }
});

function validUrl(url) {
    const urlPattern = /^(https?:\/\/)?([\w.]+)\.([a-z]{2,6}\.?)(\/[\w.]*)*\/?$/i;
    return urlPattern.test(url);
}

$("#themeBtn").on("click", function() {
    const currentTheme = $(document.body).attr("data-bs-theme");
    const oppositeTheme = currentTheme == "dark" ? "light" : "dark";

    loadTheme(oppositeTheme);
});

function loadTheme(theme) {
    localStorage.setItem("theme", theme);

    const icon = $("#themeBtn").find("i.bi");
    $(document.body).attr("data-bs-theme", theme);

    if (theme == "light") {
        icon.removeClass("bi-sun").addClass("bi-moon-stars");
        $("#brand img").attr("src", lightIconPath);
    }
    else {
        icon.removeClass("bi-moon-stars").addClass("bi-sun");
        $("#brand img").attr("src", darkIconPath);
    }
}

$("#addResolution").on("click", (e) => {
    e.preventDefault();
    addResolution();
});

function addResolution() {

    const width = $("#widthRes").val();
    const height = $("#heightRes").val();

    if (!width | !height) {
        return;
    }

    var exists = false;
    $("#resolutionsTray .res-item").each(function() {
        const [existingWidth, existingHeight] = $(this).find("span").text().split("x");
        exists = existingWidth == width & existingHeight == height;
    });

    if (exists) {
        return;
    }

    $("#resolutionsTray").append(`
        <div class="border rounded bg-body-emphasis d-flex align-items-center mx-2 mb-2 res-item" data-width="${width}" data-height="${height}">
            <span class="ms-2 me-1">${width}x${height}</span>
            <button class="btn border-0 shadow-0" type="button" onclick="$(this).parent().remove()">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `);
}

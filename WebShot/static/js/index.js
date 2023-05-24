$(document).ready(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
});

$("#searchForm").submit(function(e) {
    e.preventDefault();

    const url = $(this).find("input[type=search]").val();

    if (!validUrl(url)) {
        alert(`Invalid URL "${url}"`);
        return;
    }

    $.ajax({
        type: "POST",
        url: "/",
        contentType: "application/json",
        data: JSON.stringify({
            url: url
        }),
        error: (e) => {
            alert(JSON.stringify(e));
        },
        success: (data) => {
            // alert(JSON.stringify(data));
        }
    });
});

function validUrl(url) {
    const urlPattern = /^(https?:\/\/)?([\w.]+)\.([a-z]{2,6}\.?)(\/[\w.]*)*\/?$/i;
    return urlPattern.test(url);
}

$("#themeBtn").on("click", function() {
    const icon = $(this).find("i.bi");

    const currentTheme = $(document.body).attr("data-bs-theme");
    const oppositeTheme = currentTheme == "dark" ? "light" : "dark";

    $(document.body).attr("data-bs-theme", oppositeTheme);

    if (oppositeTheme == "light") {
        icon.removeClass("bi-sun").addClass("bi-moon-stars");
        $("#brand img").attr("src", lightIconPath);
    }
    else {
        icon.removeClass("bi-moon-stars").addClass("bi-sun");
        $("#brand img").attr("src", darkIconPath);
    }
});

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

var eventSource = new EventSource("/");
eventSource.onmessage = function(event) {
    alert("test");
    const screenshotPath = event.data;
    $("#outputRow").append(`
        <div class="col-md-3">
            <img src="${screenshotPath}" />
        </div>
    `);
}
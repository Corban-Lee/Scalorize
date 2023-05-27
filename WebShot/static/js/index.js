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

    var eventSource = new EventSource("/stream-screenshots?url=" + encodeURIComponent(url));
    eventSource.onmessage = function(event) {
        const screenshotPath = event.data;
        addItemToFileTree(screenshotPath);
        $("#outputRow").append(`
            <div class="col-xxl-2 col-xl-3 col-lg-4 col-md-6 mb-4">
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

var filesystem = [];

function loadFolder(filesList, parent=$("#filesystem ul").first()) {

    filesList.forEach((item) => {
        if (item.type === "file") {
            parent.append(`
                <li>
                    <a class="text-body text-decoration-none" href="${item.path}" target="_blank">
                        <i class="bi bi-filetype-png"></i>
                        ${item.name}
                    </a>
                </li>
            `);
        }
        else if (item.type === "folder") {
            const newParent = $(`
                <li>
                    <div class="d-flex align-items-center" data-bs-toggle="collapse" data-bs-target="#collapseFolder-${item.name}" role="button">
                        <i class="bi bi-folder me-2"></i>
                        ${item.name}
                        <i class="bi bi-chevron-down ms-auto"></i>
                    </div>
                    <ul class="collapse" id="collapseFolder-${item.name}"></ul>
                </li>
            `).appendTo(parent);

            const childList = newParent.find("ul").first();
            loadFolder(item.children, childList);
        }
    });
}

function addItemToFileTree(data, parentElement=$("#filesystem ul").first()) {
    const parts = data.split("\\").filter((part) => part !== "");
    var currentFolder = filesystem;

    for (var i = 1; i < parts.length; i++) {
        const part = parts[i];

        const existingItem = currentFolder.find((item) => item.name === part);

        if (existingItem) {
            if (i === parts.length - 1) {
                existingItem.type = "file"
            }
            else {
                currentFolder = existingItem.children
            }
        }
        else {
            const newItem = {
                name: part,
                type: i === parts.length - 1 ? "file" : "folder",
                path: data,
                children: []
            };

            currentFolder.push(newItem);
            currentFolder = newItem.children;
        }
    }

    const parent = parentElement || $("#filesystem ul").first();
    parent.html("");
    loadFolder(filesystem, parent);
}

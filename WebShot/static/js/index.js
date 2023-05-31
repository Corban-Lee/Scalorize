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

    var second = 0
    var timerInterval = setInterval(() => {
        second ++;
        $("#timer").text(second + " seconds elapsed") 
    }, 1000);

    var eventSource = new EventSource("/stream-screenshots?url=" + encodeURIComponent(url));
    eventSource.onmessage = function(event) {
        if (event.data === "DONE") {
            clearInterval(timerInterval);
            return;
        }

        const data = JSON.parse(event.data);
        const screenshotPath = data.screenshotPath.replace(/\//g, '\\');
        const browserType = data.browser;

        createFileTreeItem(screenshotPath, browserType);
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

function showFileTreeItem(item, parent) {
    if (item.type === "file") {
            parent.append(`
                <li>
                    <a class="text-body text-decoration-none" href="output/${item.path}" target="_blank">
                        <div class="filetree-item">
                            <i class="bi bi-browser-${item.browserType} me-1"></i>
                            ${item.name}
                        </div>
                    </a>
                </li>
            `);
        }
    else if (item.type === "folder") {
        parent.append($(`
            <li data-path="${item.path}">
                <div class="filetree-item" data-bs-toggle="collapse" data-bs-target="#collapseFolder-${item.path}" role="button">
                    <i class="bi bi-folder me-2"></i>
                    ${item.name}
                    <i class="bi bi-chevron-down ms-auto"></i>
                </div>
                <ul class="collapse filetree-container" id="collapseFolder-${item.path}"></ul>
            </li>
        `));
    }
}

function createFileTreeItem(data, browserType) {
    const parts = data.split("\\").filter((part) => part !== "").slice(1);

    $("#breadcrumbs ol").html("");

    for (var i = 0; i < parts.length; i++) {
        const part = parts[i]

        $("#breadcrumbs ol").append(`<li class="breadcrumb-item">${part}</li>`);

        const type = i === parts.length - 1 ? "file" : "folder";
        var path = parts.slice(0, i + 1).join("/");
        const safePath = path.replace(/[.\/]/g, '\\$&')
        const parentPath = parts.slice(0, i).join("/");
        const safeParentPath = parentPath.replace(/[.\/]/g, '\\$&');
        const exists = $(`#collapseFolder-${safeParentPath}`).length > 0;
        
        if ($(`li[data-path="${path}"]`).length !== 0) {
            continue;
        }

        var item = {
            name: part,
            type: type,
            path: path,
            safePath: safePath,
            children: [],
            browserType: browserType
        }

        if (exists) {
            var parent = $(`#collapseFolder-${safeParentPath}`);
        }
        else {
            var parent = $("nav.filetree ul.filetree-container").first();
        }
        showFileTreeItem(item, parent)
    }
}

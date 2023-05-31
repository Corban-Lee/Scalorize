$(document).ready(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

    const previousTheme = localStorage.getItem("theme");
    if (previousTheme) {
        loadTheme(previousTheme)
    }

    const previousBrowser = localStorage.getItem("browser");
    if (previousBrowser) {
        setBrowser(previousBrowser);
    }
});

$("#searchForm").submit(function(e) {
    e.preventDefault(); 

    const url = $(this).find("input[type=search]").val();

    if (!validUrl(url)) {
        alert(`Invalid URL "${url}"`);
        return;
    }

    var pagesProcessed = 0;
    var second = 0
    var timerInterval = setInterval(() => {
        second ++;
        $("#timer").text(second + " seconds elapsed") 
    }, 1000);

    var eventSource = new EventSource("/stream-screenshots?url=" + encodeURIComponent(url) + "&browser=" + localStorage.getItem("browser"));
    eventSource.onmessage = function(event) {
        if (event.data === "DONE") { // move this to the error event handler with no DONE status message
            clearInterval(timerInterval);
            return;
        }

        pagesProcessed ++;
        $("#pagesProcessed").text(`${pagesProcessed} pages processed`)

        const data = JSON.parse(event.data);
        const screenshotPath = data.screenshotPath.replace(/\//g, '\\');
        const browserType = data.browser;

        createFileTreeItem(screenshotPath, browserType);

        const fileName = screenshotPath.split("\\").slice(-1)[0];
        console.log(JSON.stringify(fileName))
        var [width, height] = fileName.replace(".png", "").split(/x(.*)/s);

        $("#outputRow").append(`
            <div class="col-xxl-2 col-xl-3 col-lg-4 col-sm-6 mb-4">
                <div class="position-relative">
                <a type="button" href="${screenshotPath}" target="_blank">
                    <div class="position-absolute top-0 start-0 m-1 bg-opacity-50 badge bg-secondary">
                        ${width} x ${height}
                    </div>
                    <img src="${screenshotPath}" class="w-100 rounded shadow-sm"/>
                    </a>
                </div>
            </div>
        `);
    }
                // <div class="position-absolute top-0 end-0 m-1 bg-opacity-50 badge bg-secondary">
                //     ${browserType}
                // </div>
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

$("#browserBtn").on("click", function() {
    const currentBrowser = localStorage.getItem("browser");
    const oppositeBrowser = currentBrowser == "chrome" ? "firefox" : "chrome";
    localStorage.setItem("browser", oppositeBrowser);

    setBrowser(oppositeBrowser);
});

function setBrowser(browser) {
    const icon = $("#browserBtn").find("i.bi");

    if (browser === "chrome") {
        icon.removeClass("bi-browser-firefox").addClass("bi-browser-chrome");
    }
    else {
        icon.removeClass("bi-browser-chrome").addClass("bi-browser-firefox");       
    }
}

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
            parent.prepend($(`
                <li>
                    <a class="text-body text-decoration-none" href="output/${item.path}" target="_blank">
                        <div class="filetree-item">
                            <i class="bi bi-browser-${item.browserType} mx-2 text-body-emphasis"></i>
                            <span class="filetree-item-name">${item.name}</span>
                        </div>
                    </a>
                </li>
            `).css("--indent", item.indent));
        }
    else if (item.type === "folder") {
        parent.append($(`
            <li data-path="${item.path}">
                <div class="filetree-item" data-bs-toggle="collapse" data-bs-target="#collapseFolder-${item.path}" role="button">
                    <i class="bi bi-chevron-down filetree-item-name"></i>
                    <i class="bi bi-slash-lg mx-2 text-body-emphasis"></i>
                    <span class="filetree-item-name">${item.name}</span>
                </div>
                <ul class="collapse filetree-container ${item.show}" id="collapseFolder-${item.path}"></ul>
            </li>
        `).css("--indent", item.indent));
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
            browserType: browserType,
            show: i === 0 ? "show" : "",
            indent: i + 1 + "rem"
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

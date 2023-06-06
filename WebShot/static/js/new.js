
/**
 * Generates a random unique ID
 */
function generateUniqueId() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    return `${timestamp}-${random}`;
}

// COLLAPSE CHEVRON
// $(document).ready(function() {
//     $(".folder > div").on("click", function() {
//         $(this).find(".bi").css("transform", "rotate(90deg)")
//     });
// });

function validUrl(url) {
    const urlPattern = /^(https?:\/\/)?([\w.]+)\.([a-z]{2,6}\.?)(\/[\w.]*)*\/?$/i;
    return urlPattern.test(url);
}

$("#searchForm").submit(function(event) {
    event.preventDefault();

    const address = $(this).find("input[type=search]").val();

    if (!validUrl(address)) {
        alert("Please enter a valid web address");
        return;
    }

    const encodedAddress = encodeURIComponent(address);
    const eventSourceUrl = `/stream-screenshots?url=${encodedAddress}&browser=firefox`;

    var eventSource = new EventSource(eventSourceUrl);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const screenshotPath = data.screenshotPath.replace(/\//g, '\\');

        $("#resultArea").append(`
            <div class="col-xxl-2 col-xl-3 col-lg-4 col-sm-6">
                <a href="${screenshotPath}" target="_blank">
                    <img src="${screenshotPath}" class="w-100 rounded border">
                </a>
            </div>
        `);

        addFiletreeItem(screenshotPath);
    }

    eventSource.onerror = () => {
        console.error("An error occured while trying to connect [eventsource]");
    }
});

function addFiletreeItem(screenshotPath) {
    const pathParts = screenshotPath.split("\\").filter((part) => part !== "").splice(1);

    for (var i = 0; i < pathParts.length; i++) {
        const path = pathParts.slice(0, i + 1).join("/");

        if ($(`li[data-path="${path}"]`).length !== 0) {
            continue;
        }

        const part = pathParts[i];
        const type = i === pathParts.length - 1 ? "file" : "folder";
        const safePath = path.replace(/[.\/]/g, '\\$&')
        const parentPath = pathParts.slice(0, i).join("/");
        const safeParentPath = parentPath.replace(/[.\/]/g, '\\$&');

        var item = {
            name: part,
            type: type,
            path: path,
            safePath: safePath,
            children: [],
            show: i === 0 ? "show" : "",
        }

        var parent = $(`li[data-path="${safeParentPath}"]`).length > 0 ? $(`#collapse-${safeParentPath}`) : $("#filetree > ul").first();
        showFiletreeItem(item, parent)
    }
}

function showFiletreeItem(item, parent) {
    if (item.type === "file") {
        const itemElement = $(`
            <li class="filetree-item file">
                <a href="output/${item.path}" target="_blank">
                    <i class="bi bi-browser-chrome me-1"></i>
                    <span>${item.name}</span>
                </a>
            </li>
        `);
        parent.prepend(itemElement);
    }
    else if (item.type === "folder") {
        const itemElement = $(`
            <li data-path="${item.path}" class="filetree-item folder">
                <div data-bs-toggle="collapse" data-bs-target="#collapse-${item.path}" role="button">
                    <i class="bi bi-chevron-right me-1"></i>
                    <span>${item.name}</span>
                </div>
                <ul class="collapse" id="collapse-${item.path}"></ul>
            </li>
        `)
        parent.append(itemElement);

        // Change the chevron direction on showing collapse
        itemElement.on("click", function(event) {
            const icon = $(event.currentTarget).find(".bi").first();
            const showing = $(event.currentTarget).find("div[data-bs-toggle='collapse']").first().hasClass("collapsed");

            const transform = !showing ? "rotate(90deg)" : "";
            icon.css("transform", transform);

            event.stopPropagation();
        });
    }
}

$(document).ready(function() {
    
    const theme = localStorage.getItem("theme");
    loadTheme(theme);
});

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
        $("#brand img").attr("src", logo);
    }
    else {
        icon.removeClass("bi-moon-stars").addClass("bi-sun");
        $("#brand img").attr("src", logoAlt);
    }
}
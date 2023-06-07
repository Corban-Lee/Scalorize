
/**
 * Generates a random unique ID
 */
function generateUniqueId() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    return `${timestamp}-${random}`;
}

/**
 * Tests the validity of a given URL.
 * @param {string} url - The URL to validate.
 * @returns {boolean} - True if the URL is valid
 */
function validUrl(url) {
    const urlPattern = /^(https?:\/\/)?([\w.]+)\.([a-z]{2,6}\.?)(\/[\w.]*)*\/?$/i;
    return urlPattern.test(url);
}

$(document).ready(function() {

    // Load the stored or default driver
    var storedDriver = localStorage.getItem('driver');
    storedDriver = !storedDriver ? "chrome" : storedDriver;
    $(`input[name='drivers'][value='${storedDriver}']`).prop('checked', true);

    // Store the selected driver
    $("input[name='drivers']").on("click", function() {
        localStorage.setItem("driver", $(this).val());
    });
});


$("#searchForm").submit(function(event) {
    event.preventDefault();

    const address = $(this).find("#search").val();

    if (!validUrl(address)) {
        alert("Please enter a valid web address");
        return;
    }

    const browser = $("input[name='drivers']:checked").val();

    if (!browser) {
        alert("Please select a driver from the drivers dropdown");
        return;
    }
    
    const encodedAddress = encodeURIComponent(address);
    const eventSourceUrl = `/stream-screenshots?url=${encodedAddress}&browser=${browser}`;

    var eventSource = new EventSource(eventSourceUrl);

    // Disable UI
    $("#search").prop("disabled", true);
    $("#searchBtn").prop("disabled", true);
    $("input[name='drivers']").prop("disabled", true);
    $("#btnDrivers").prop("disabled", true);
    $("#collapseDrivers").removeClass("show");

    // Show new task
    $("#taskToast .timer").text("0.0");
    $("#taskToast .breadcrumb").html("");
    $("#taskToast .task-domain").text(address.split("://")[1]);
    $("#taskToast .browser-icon").removeClass().addClass(`browser-icon bi bi-browser-${browser}`);
    $("#taskToast").addClass("show");

    var timer = 0.0
    var timerInterval = setInterval(() => {
        timer += 0.1;
        $("#taskToast .timer").text(timer.toFixed(1));
    }, 100);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const screenshotPath = data.screenshotPath;

        addFiletreeItem(screenshotPath.replace(/\//g, '\\'), browser);

        if ($(`#resultArea a[href="${screenshotPath}"]`).length === 0) {
            // col-xxl-2 col-xl-3 col-lg-4 col-sm-6
            $("#resultArea").append(`
                <div class="col-xxl-2 col-xl-3 col-lg-4 col-sm-6" data-item="${screenshotPath}">
                    <a href="${screenshotPath}" target="_blank">
                        <img src="${screenshotPath}" class="w-100 rounded border">
                    </a>
                </div>
            `);
        }
    }

    eventSource.onerror = () => {
        console.error("An error occured while trying to connect [eventsource]");
        eventSource.close();

        // Enable UI
        $("#search").prop("disabled", false);
        $("#searchBtn").prop("disabled", false);
        $("input[name='drivers']").prop("disabled", false);
        $("#btnDrivers").prop("disabled", false);

        // Hide task
        $("#taskToast").removeClass("show");
        clearInterval(timerInterval);
    }
});

function addFiletreeItem(screenshotPath, browser) {
    const pathParts = screenshotPath.split("\\").filter((part) => part !== "").splice(1);

    $("#taskToast .breadcrumb").html("");

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

        $("#taskToast .breadcrumb").append(`<li class="breadcrumb-item">${part}</li>`);

        var parent = $(`li[data-path="${safeParentPath}"]`).length > 0 ? $(`#collapse-${safeParentPath}`) : $("#filetree > ul").first();
        showFiletreeItem(item, parent, browser)
    }
}

function showFiletreeItem(item, parent, browser) {
    if (item.type === "file") {
        const itemElement = $(`
            <li data-path="${item.path}" class="filetree-item file">
                <a href="output/${item.path}" target="_blank">
                    <i class="bi bi-browser-${browser} me-1"></i>
                    <span>${item.name}</span>
                </a>
            </li>
        `);
        parent.prepend(itemElement); // prepend so files appear before folders
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
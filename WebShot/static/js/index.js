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
        createFileTreeItem(screenshotPath);
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

// var filesystem = [];

// function loadFolder(filesList, parent=$("nav.filetree > ul.filetree-container").first()) {

//     filesList.forEach((item, i) => {
//         if (item.type === "file") {
//             parent.append(`
//                 <li>
//                     <a class="text-body text-decoration-none" href="${item.path}" target="_blank">
//                         <div class="filetree-item">
//                             <i class="bi bi-browser-chrome me-1"></i>
//                             ${item.name}
//                         </div>
//                     </a>
//                 </li>
//             `);
//         }
//         else if (item.type === "folder") {
//             const newParent = $(`
//                 <li>
//                     <div class="filetree-item" data-bs-toggle="collapse" data-bs-target="#collapseFolder-${item.name}" role="button">
//                         <i class="bi bi-folder me-2"></i>
//                         ${item.name}
//                         <i class="bi bi-chevron-down ms-auto"></i>
//                     </div>
//                     <ul class="collapse filetree-container show" id="collapseFolder-${item.name}"></ul>
//                 </li>
//             `).appendTo(parent);

//             const childList = newParent.find("ul.filetree-container").first();
//             // if (i == 0) {
//             //     childList.addClass("show")
//             // }

//             loadFolder(item.children, childList);
//         }
//     });
// }

// function addItemToFileTree(data, parentElement=$("nav.filetree > ul.filetree-container").first()) {
//     const parts = data.split("\\").filter((part) => part !== "");
//     var currentFolder = filesystem;

//     for (var i = 1; i < parts.length; i++) {
//         const part = parts[i];

//         const existingItem = currentFolder.find((item) => item.name === part);

//         if (existingItem) {
//             if (i === parts.length - 1) {
//                 existingItem.type = "file"
//             }
//             else {
//                 currentFolder = existingItem.children
//                 parentElement = $(`#collapsableFolder-${part}`);
//             }
//         }
//         else {
//             const newItem = {
//                 name: part,
//                 type: i === parts.length - 1 ? "file" : "folder",
//                 path: data,
//                 children: []
//             };

//             currentFolder.push(newItem);
//             currentFolder = newItem.children;
//         }
//     }

//     const parent = typeof parentElement == "undefined" ? $("nav.filetree ul.filetree-container").first() : parentElement;
//     parent.html("");
//     loadFolder(filesystem, parent);
// }

function showFileTreeItem(item, parent) {
    if (item.type === "file") {
            parent.append(`
                <li>
                    <a class="text-body text-decoration-none" href="output/${item.path}" target="_blank">
                        <div class="filetree-item">
                            <i class="bi bi-browser-chrome me-1"></i>
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

function createFileTreeItem(data) {
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
            children: []
        }

        if (exists) {
            var parent = $(`#collapseFolder-${safeParentPath}`);
        }
        else {
            var parent = $("nav.filetree ul.filetree-container").first();
        }
        // console.log(parent.length + " " + i + " " + JSON.stringify(item));
        showFileTreeItem(item, parent)
    }
}

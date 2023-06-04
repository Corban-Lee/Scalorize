
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
    const eventSourceUrl = `/stream-screenshots?url=${encodedAddress}&browser=chrome`;

    var eventSource = new EventSource(eventSourceUrl);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const screenshotPath = data.screenshotPath.replace(/\//g, '\\');

        $("#resultArea").append(`
            <div class="col-2 mb-3">
                <img src="${screenshotPath}" class="w-100 rounded">
            </div>
        `);
    }

    eventSource.onerror = () => {
        console.error("An error occured while trying to connect [eventsource]");
    }
});
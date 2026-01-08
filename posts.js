// WatchoMovies Posts Module - SYNCHRONOUS VERSION for Rhino JS

var BASE_URL = "https://watchomovies.makeup";

var headers = {
    "Referer": "https://watchomovies.makeup/",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
};

function getPosts(filter, page, providerContext) {
    console.log("getPosts called with filter:", filter, "page:", page);

    try {
        var url;
        if (filter === "" || filter === "/") {
            // Homepage - get featured content
            if (page <= 1) {
                url = BASE_URL + "/";
            } else {
                url = BASE_URL + "/page/" + page + "/";
            }
        } else {
            // Category/genre pages - ensure filter has trailing slash
            var cleanFilter = filter.replace(/\/$/, ""); // Remove trailing slash if present
            if (page <= 1) {
                url = BASE_URL + cleanFilter + "/";
            } else {
                url = BASE_URL + cleanFilter + "/page/" + page + "/";
            }
        }
        console.log("Fetching URL:", url);

        console.log("Fetching URL:", url);

        var html = "";
        if (typeof browser !== "undefined" && browser.get) {
            console.log("Using WebView Browser for Cloudflare Bypass");
            html = browser.get(url);
            console.log("HTML received via Browser. Length:", html.length);
            console.log("HTML Start:", html.substring(0, 500));
        } else {
            console.log("Using Axios (Legacy)");
            var response = axios.get(url, { headers: headers });
            html = response.data;
        }

        if (!html) {
            console.error("No html data received");
            return [];
        }

        var $ = cheerio.load(html);
        var posts = [];

        // WatchoMovies uses div.ml-item for movie cards
        var items = $("div.ml-item");
        console.log("Found ml-item items:", items.length);

        for (var i = 0; i < items.length; i++) {
            try {
                var element = items.eq(i);
                // Try multiple selector patterns
                var link = element.find("a.ml-mask").first();
                if (!link.length) link = element.find("a").first();

                var img = element.find("img").first();

                // Title can be in h2 inside the link or in .mli-info
                var titleEl = link.find("h2").first();
                if (!titleEl.length) titleEl = element.find(".mli-info h2").first();
                if (!titleEl.length) titleEl = element.find("h2").first();

                var title = titleEl.text() || img.attr("alt") || img.attr("oldtitle") || "";
                var href = link.attr("href") || "";
                // WatchoMovies uses data-original for lazy loading images
                var image = img.attr("data-original") || img.attr("src") || img.attr("data-src") || "";

                // Clean up title
                title = title.trim();

                if (title && href && image) {
                    posts.push({
                        title: title,
                        link: href,
                        image: image
                    });
                }
            } catch (e) {
                console.error("Error parsing item:", e);
            }
        }

        // Fallback: try article.item structure
        if (posts.length === 0) {
            var articleItems = $("article.item");
            console.log("Fallback article items:", articleItems.length);

            for (var j = 0; j < articleItems.length; j++) {
                try {
                    var el = articleItems.eq(j);
                    var lnk = el.find("a").first();
                    var img2 = el.find("img").first();
                    var ttl = el.find("h2, h3, .title").first();

                    var t = ttl.text() || img2.attr("alt") || "";
                    var h = lnk.attr("href") || "";
                    var im = img2.attr("data-original") || img2.attr("src") || "";

                    if (t && h && im) {
                        posts.push({
                            title: t.trim(),
                            link: h,
                            image: im
                        });
                    }
                } catch (e) {
                    console.error("Error parsing article item:", e);
                }
            }
        }

        console.log("Found", posts.length, "posts");
        return posts;
    } catch (err) {
        console.error("getPosts error:", err.message || err);
        return [];
    }
}

function getSearchPosts(query, page, providerContext) {
    console.log("getSearchPosts called with query:", query, "page:", page);

    try {
        // WatchoMovies search URL format
        var url = BASE_URL + "/page/" + page + "/?s=" + encodeURIComponent(query);
        console.log("Search URL:", url);

        console.log("Search URL:", url);

        var html = "";
        if (typeof browser !== "undefined" && browser.get) {
            html = browser.get(url);
        } else {
            var response = axios.get(url, { headers: headers });
            html = response.data;
        }

        if (!html) {
            console.error("No search data received");
            return [];
        }

        var $ = cheerio.load(html);
        var posts = [];

        // Search results use same ml-item structure
        var items = $("div.ml-item");
        console.log("Found search items:", items.length);

        for (var i = 0; i < items.length; i++) {
            try {
                var element = items.eq(i);
                var link = element.find("a.ml-mask").first();
                var img = element.find("img.mli-thumb").first();
                var titleEl = element.find(".mli-info h2").first();

                var title = titleEl.text() || img.attr("alt") || "";
                var href = link.attr("href") || "";
                var image = img.attr("data-original") || img.attr("src") || "";

                title = title.trim();

                if (title && href && image) {
                    posts.push({
                        title: title,
                        link: href,
                        image: image
                    });
                }
            } catch (e) {
                console.error("Error parsing search item:", e);
            }
        }

        console.log("Found", posts.length, "search results");
        return posts;
    } catch (err) {
        console.error("getSearchPosts error:", err.message || err);
        return [];
    }
}

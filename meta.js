// WatchoMovies Meta Module - SYNCHRONOUS VERSION for Rhino JS
// Extracts movie details and streaming links from WatchoMovies

var headers = {
    "Referer": "https://google.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

function getMetaData(link, providerContext) {
    console.log("getMetaData called - link:", link);

    try {
        var html = "";
        if (typeof browser !== "undefined" && browser.get) {
            console.log("Using WebView Browser for Meta");
            html = browser.get(link);
            console.log("Meta HTML Length:", html.length);
            console.log("Meta HTML Start:", html.substring(0, 500));
        } else {
            var response = axios.get(link, { headers: headers });
            html = response ? response.data : "";
        }

        if (!html) {
            console.error("No meta html data");
            return createEmptyMeta();
        }

        var $ = cheerio.load(html);

        // WatchoMovies PsyPlay theme uses specific selectors
        // Extract title from .mvic-desc h3 or og:title
        var title = "";

        // Try simpler selector first
        var titleEl = $(".mvic-desc h3").first();
        if (titleEl.length > 0) {
            title = titleEl.text().trim();
        }
        // Fallback to og:title (meta tags are more reliable)
        if (!title) {
            var metas = $("meta");
            for (var m = 0; m < metas.length; m++) {
                var meta = metas.eq(m);
                if (meta.attr("property") === "og:title") {
                    title = meta.attr("content") || "";
                    break;
                }
            }
        }
        // Last fallback to page title
        if (!title) {
            title = $("title").text().trim().split(" - ")[0];
        }
        // Clean up title
        title = title.replace(/Download.*$/i, "").trim();
        title = title.replace(/Watch Online.*$/i, "").trim();
        title = title.replace(/Full Movie.*$/i, "").trim();
        title = title.replace(/&amp;/g, "&");
        console.log("Title found:", title ? title.substring(0, 40) : "none");

        // Determine content type
        var type = "movie";
        var lowerTitle = title.toLowerCase();
        if (lowerTitle.indexOf("season") !== -1 || lowerTitle.indexOf("episode") !== -1) {
            type = "series";
        }

        // Extract poster image from .mvic-thumb img or og:image
        var image = "";
        var posterImg = $(".mvic-thumb img").first();
        if (posterImg.length > 0) {
            image = posterImg.attr("src") || posterImg.attr("data-src") || "";
        }
        // Fallback to og:image
        if (!image) {
            var metas2 = $("meta");
            for (var m2 = 0; m2 < metas2.length; m2++) {
                var meta2 = metas2.eq(m2);
                if (meta2.attr("property") === "og:image") {
                    image = meta2.attr("content") || "";
                    break;
                }
            }
        }
        console.log("Image found:", image ? image.substring(0, 50) : "none");

        // Extract synopsis/description from .f-desc or og:description
        var synopsis = "";
        var synopsisEl = $("p.f-desc").first();
        if (synopsisEl.length > 0) {
            synopsis = synopsisEl.text().trim();
        }
        // Fallback - try og:description
        if (!synopsis || synopsis.length < 20) {
            var metas3 = $("meta");
            for (var m3 = 0; m3 < metas3.length; m3++) {
                var meta3 = metas3.eq(m3);
                if (meta3.attr("property") === "og:description") {
                    synopsis = meta3.attr("content") || "";
                    break;
                }
            }
        }
        // Fallback - try meta description
        if (!synopsis || synopsis.length < 20) {
            var metas4 = $("meta");
            for (var m4 = 0; m4 < metas4.length; m4++) {
                var meta4 = metas4.eq(m4);
                if (meta4.attr("name") === "description") {
                    synopsis = meta4.attr("content") || "";
                    break;
                }
            }
        }
        if (!synopsis || synopsis.length < 20) {
            synopsis = "Watch " + (title || "content") + " online in HD quality.";
        }
        console.log("Synopsis length:", synopsis.length);

        // Extract metadata (genre, year, rating, etc.)
        var genres = [];
        var genreLinks = $('a[href*="/genre/"]');
        for (var g = 0; g < genreLinks.length && g < 10; g++) {
            var genreText = genreLinks.eq(g).text().trim();
            if (genreText && genres.indexOf(genreText) === -1) {
                genres.push(genreText);
            }
        }

        // Extract year
        var year = "";
        var yearLink = $('a[href*="/release-year/"]').first();
        if (yearLink.length > 0) {
            year = yearLink.text().trim();
        }
        if (!year) {
            var yearMatch = title.match(/\((\d{4})\)/);
            if (yearMatch) {
                year = yearMatch[1];
            }
        }

        // Extract rating (IMDb)
        var rating = "";
        var ratingText = $(".imdb, .rating, .vote").text();
        if (ratingText) {
            var ratingMatch = ratingText.match(/(\d+\.?\d*)/);
            if (ratingMatch) {
                rating = ratingMatch[1];
            }
        }

        // Extract duration
        var duration = "";
        var durationText = $(".runtime, .duration").text();
        if (durationText) {
            var durationMatch = durationText.match(/(\d+)\s*min/i);
            if (durationMatch) {
                duration = durationMatch[1] + " min";
            }
        }

        // Extract director
        var director = "";
        var directorLink = $('a[href*="/director/"]').first();
        if (directorLink.length > 0) {
            director = directorLink.text().trim();
        }

        // Extract cast
        var cast = [];
        var castLinks = $('a[href*="/stars/"]');
        for (var c = 0; c < castLinks.length && c < 10; c++) {
            var actorName = castLinks.eq(c).text().trim();
            if (actorName && cast.indexOf(actorName) === -1) {
                cast.push(actorName);
            }
        }

        // ============================================
        // EXTRACT STREAMING/DOWNLOAD LINKS (linkList)
        // ============================================
        var linkList = [];
        var directLinks = [];

        // WatchoMovies may use various selectors - try multiple patterns
        var downloadLinks = $(
            "#list-dl a.lnk-lnk, " +
            ".lnk-lnk, " +
            ".server-item a, " +
            ".tab-content a[href*='http'], " +
            ".download-links a, " +
            ".dl-links a, " +
            "a[href*='speedostream'], " +
            "a[href*='streamwish'], " +
            "a[href*='filelions'], " +
            "a[href*='hubcloud'], " +
            "a[href*='gdrive'], " +
            "a[href*='gofile'], " +
            "a[href*='doodstream'], " +
            "a[href*='streamtape'], " +
            "a[href*='mixdrop'], " +
            "a.btn[href*='http']"
        );
        console.log("Download links found:", downloadLinks.length);

        // Fallback: if no links found, try broader search
        if (downloadLinks.length === 0) {
            downloadLinks = $("a[target='_blank'][href*='http']");
            console.log("Fallback links found:", downloadLinks.length);
        }

        for (var s = 0; s < downloadLinks.length && s < 50; s++) {
            var anchor = downloadLinks.eq(s);
            var href = anchor.attr("href") || "";
            var linkText = anchor.text().trim();

            // Skip invalid links
            if (!href || href === "#" || href.indexOf("javascript:") === 0) continue;
            if (href.indexOf("http") !== 0) continue;

            // Skip social/sharing links AND same-site navigation links
            if (href.indexOf("facebook.") !== -1 ||
                href.indexOf("twitter.") !== -1 ||
                href.indexOf("telegram.") !== -1 ||
                href.indexOf("instagram.") !== -1 ||
                href.indexOf("watchomovies.makeup") !== -1) continue;

            // Check if it's a known streaming/download provider
            var isStreamLink = (
                href.indexOf("speedostream") !== -1 ||
                href.indexOf("streamwish") !== -1 ||
                href.indexOf("filelions") !== -1 ||
                href.indexOf("streamtape") !== -1 ||
                href.indexOf("doodstream") !== -1 ||
                href.indexOf("mixdrop") !== -1 ||
                href.indexOf("hubcloud") !== -1 ||
                href.indexOf("hubdrive") !== -1 ||
                href.indexOf("gdrive") !== -1 ||
                href.indexOf("gofile") !== -1 ||
                href.indexOf("pixeldrain") !== -1 ||
                href.indexOf("dropbox") !== -1 ||
                href.indexOf("mega.nz") !== -1 ||
                href.indexOf("mediafire") !== -1 ||
                href.indexOf("/e/") !== -1 ||
                href.indexOf("/embed") !== -1
            );

            if (isStreamLink) {
                // Try to extract quality from link text or sibling spans
                var quality = "";
                var qualityMatch = linkText.match(/(\d{3,4}p|HD|4K|720|1080|480)/i);
                if (qualityMatch) {
                    quality = qualityMatch[0].toUpperCase();
                    if (quality.match(/^\d+$/)) quality = quality + "p";
                }

                // Check parent for quality info too
                var parentText = anchor.parent().text();
                if (!quality && parentText) {
                    var parentQualityMatch = parentText.match(/(\d{3,4}p|HD|4K)/i);
                    if (parentQualityMatch) {
                        quality = parentQualityMatch[0].toUpperCase();
                    }
                }

                // Determine server name from URL
                var server = "Stream";
                if (href.indexOf("speedostream") !== -1) server = "SpeedoStream";
                else if (href.indexOf("streamwish") !== -1) server = "StreamWish";
                else if (href.indexOf("filelions") !== -1) server = "FileLions";
                else if (href.indexOf("streamtape") !== -1) server = "StreamTape";
                else if (href.indexOf("doodstream") !== -1) server = "DoodStream";
                else if (href.indexOf("mixdrop") !== -1) server = "MixDrop";
                else if (href.indexOf("hubcloud") !== -1 || href.indexOf("hubdrive") !== -1) server = "HubCloud";
                else if (href.indexOf("gdrive") !== -1) server = "GDrive";
                else if (href.indexOf("gofile") !== -1) server = "GoFile";
                else if (href.indexOf("pixeldrain") !== -1) server = "PixelDrain";
                else if (href.indexOf("mega.nz") !== -1) server = "Mega";
                else if (href.indexOf("mediafire") !== -1) server = "MediaFire";
                else if (linkText && linkText.length < 25) server = linkText;

                var linkTitle = server;
                if (quality) {
                    linkTitle = server + " " + quality;
                }

                // Check for duplicates before adding
                var isDuplicate = false;
                for (var dup = 0; dup < directLinks.length; dup++) {
                    if (directLinks[dup].link === href) {
                        isDuplicate = true;
                        break;
                    }
                }

                if (!isDuplicate) {
                    directLinks.push({
                        title: linkTitle,
                        link: href,
                        quality: quality,
                        type: "stream"
                    });
                }
            }
        }

        // Also check for iframe sources (embedded players)
        // WatchoMovies hides iframes in #content-embed container
        var iframes = $("#content-embed iframe[src], iframe[src]");
        console.log("Iframes found:", iframes.length);
        for (var f = 0; f < iframes.length; f++) {
            var iframeSrc = iframes.eq(f).attr("src") || "";
            if (iframeSrc.indexOf("speedostream") !== -1 ||
                iframeSrc.indexOf("streamwish") !== -1 ||
                iframeSrc.indexOf("filelions") !== -1) {

                var iframeServer = "Embedded Player";
                if (iframeSrc.indexOf("speedostream") !== -1) iframeServer = "SpeedoStream";
                else if (iframeSrc.indexOf("streamwish") !== -1) iframeServer = "StreamWish";
                else if (iframeSrc.indexOf("filelions") !== -1) iframeServer = "FileLions";

                directLinks.push({
                    title: iframeServer,
                    link: iframeSrc,
                    type: "stream"
                });
            }
        }

        // Also check for embed links in anchor tags (backup method)
        var embedLinks = $("a[href*='speedostream'], a[href*='embed-']");
        for (var e = 0; e < embedLinks.length; e++) {
            var embedHref = embedLinks.eq(e).attr("href") || "";
            if (embedHref.indexOf("speedostream") !== -1 && embedHref.indexOf("embed") !== -1) {
                // Check if already added
                var alreadyAdded = false;
                for (var d = 0; d < directLinks.length; d++) {
                    if (directLinks[d].link === embedHref) {
                        alreadyAdded = true;
                        break;
                    }
                }
                if (!alreadyAdded) {
                    directLinks.push({
                        title: "SpeedoStream",
                        link: embedHref,
                        type: "stream"
                    });
                }
            }
        }

        console.log("Direct links found:", directLinks.length);

        // Build linkList structure - must match app's expected format
        // Each item needs: title, link (first link), directLinks (array of individual links)
        if (directLinks.length > 0) {
            // Group by quality if available
            var hdLinks = [];
            var sdLinks = [];
            var otherLinks = [];

            for (var dl = 0; dl < directLinks.length; dl++) {
                var dlink = directLinks[dl];
                var q = (dlink.quality || "").toUpperCase();

                if (q.indexOf("1080") !== -1 || q.indexOf("HD") !== -1 || q.indexOf("4K") !== -1) {
                    hdLinks.push(dlink);
                } else if (q.indexOf("720") !== -1 || q.indexOf("480") !== -1) {
                    sdLinks.push(dlink);
                } else {
                    otherLinks.push(dlink);
                }
            }

            // Add HD links
            if (hdLinks.length > 0) {
                linkList.push({
                    title: "HD Quality",
                    link: hdLinks[0].link,
                    directLinks: hdLinks
                });
            }

            // Add SD links
            if (sdLinks.length > 0) {
                linkList.push({
                    title: "SD Quality",
                    link: sdLinks[0].link,
                    directLinks: sdLinks
                });
            }

            // Add other links
            if (otherLinks.length > 0) {
                linkList.push({
                    title: "Stream Links",
                    link: otherLinks[0].link,
                    directLinks: otherLinks
                });
            }

            // If no grouping worked, just add all
            if (linkList.length === 0) {
                linkList.push({
                    title: "Available Streams",
                    link: directLinks[0].link,
                    directLinks: directLinks
                });
            }
        }

        console.log("Final linkList groups:", linkList.length);

        return {
            title: title,
            type: type,
            image: image,
            poster: image,
            background: image,
            synopsis: synopsis,
            year: year,
            rating: rating,
            duration: duration,
            director: director,
            cast: cast.join(", "),
            tags: genres,
            linkList: linkList
        };

    } catch (err) {
        console.error("getMetaData error:", err.message || err);
        return createEmptyMeta();
    }
}

function createEmptyMeta() {
    return {
        title: "",
        type: "movie",
        image: "",
        poster: "",
        background: "",
        synopsis: "",
        year: "",
        rating: "",
        tags: [],
        linkList: []
    };
}

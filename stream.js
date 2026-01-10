// WatchoMovies Stream Module - DOM-only extraction
// 
// WatchoMovies uses speedostream, streamwish, filelions etc for hosting
// These are direct embed players - we extract the video source from them
//
// FLOW:
// 1. speedostream/streamwish page → extract video source from player
// 2. For packed JS, decode and find the source URL

var headers = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Referer": "https://watchomovies.makeup/"
};

/**
 * Get streams for a given link
 * Returns DOM extraction rules for the hidden browser
 */
function getStreams(link, type) {
    console.log("getStreams called with:", link);

    // SpeedoStream / StreamoUpload - most common on WatchoMovies
    if (link.indexOf("speedostream") !== -1 || link.indexOf("streamoupload") !== -1) {
        return getSpeedoStreamExtraction(link);
    }

    // StreamWish
    if (link.indexOf("streamwish") !== -1 || link.indexOf("swdyu") !== -1) {
        return getStreamWishExtraction(link);
    }

    // FileLions
    if (link.indexOf("filelions") !== -1 || link.indexOf("alions") !== -1) {
        return getFileLionsExtraction(link);
    }

    // StreamTape
    if (link.indexOf("streamtape") !== -1 || link.indexOf("stape") !== -1) {
        return getStreamTapeExtraction(link);
    }

    // DoodStream
    if (link.indexOf("doodstream") !== -1 || link.indexOf("dood.") !== -1) {
        return getDoodStreamExtraction(link);
    }

    // MixDrop
    if (link.indexOf("mixdrop") !== -1) {
        return getMixDropExtraction(link);
    }

    // Unknown - try generic video extraction
    console.log("Unknown link type, trying generic extraction");
    return getGenericVideoExtraction(link);
}

/**
 * SpeedoStream Extraction - CORRECT FLOW (Based on user testing):
 * 
 * 1. Original URL: https://speedostream1.com/17fo1lpe9a7p.html
 * 2. Convert to:   https://speedostream1.com/d/17fo1lpe9a7p.html (add /d/)
 * 3. Page 2: Quality selection (UHD quality, Low quality) → /d/{id}_x or /d/{id}_l
 * 4. Page 3: "Download File" button → POST with imhuman=
 * 5. Page 4: "Direct Download Link" → Final MP4 URL
 */
function getSpeedoStreamExtraction(link) {
    console.log("SpeedoStream extraction:", link);

    // StreamoUpload uses different structure - extract via browser.get()
    if (link.indexOf("streamoupload") !== -1) {
        console.log("StreamoUpload detected - extracting via browser");
        return getStreamoUploadExtraction(link);
    }

    // Warm up Cloudflare cookies via Interactive Solver / Overlay
    if (typeof browser !== "undefined" && browser.get) {
        console.log("Warming up cookies for", link);
        browser.get(link);
    }

    var speedoHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://watchomovies.makeup/",
        "Accept": "text/html,application/xhtml+xml",
        "Content-Type": "application/x-www-form-urlencoded"
    };

    try {
        // Step 1: Convert original URL to /d/ format (only for speedostream)
        // https://speedostream1.com/17fo1lpe9a7p.html → https://speedostream1.com/d/17fo1lpe9a7p.html
        var dUrl = link;
        var baseMatch = link.match(/^(https?:\/\/[^\/]+)\/([^\/.]+)\.html/);
        if (baseMatch) {
            var baseUrl = baseMatch[1];
            var fileId = baseMatch[2];
            dUrl = baseUrl + "/d/" + fileId + ".html";
            console.log("Converted to /d/ URL:", dUrl);
        }

        // Step 2: GET the /d/ page to see quality options
        console.log("Step 2: GET quality selection page");
        speedoHeaders["Referer"] = link;
        var resp1 = axios.get(dUrl, { headers: speedoHeaders });
        var html1 = resp1.data;
        var $1 = cheerio.load(html1);

        // Find quality links (UHD quality → /d/{id}_x, Low quality → /d/{id}_l)
        var qualityLinks = [];
        $1("a[href*='/d/']").each(function () {
            var href = $1(this).attr("href") || "";
            var text = $1(this).text().trim();
            if (href.indexOf("/d/") !== -1 && (href.indexOf("_x") !== -1 || href.indexOf("_l") !== -1 || href.indexOf("_h") !== -1)) {
                var fullHref = href;
                if (href.indexOf("http") !== 0) {
                    fullHref = baseMatch ? baseMatch[1] + href : href;
                }
                qualityLinks.push({
                    href: fullHref,
                    text: text,
                    quality: text.toLowerCase().indexOf("uhd") !== -1 ? "UHD" :
                        text.toLowerCase().indexOf("low") !== -1 ? "SD" : "HD"
                });
            }
        });

        console.log("Quality links found:", qualityLinks.length);

        var streams = [];

        // Step 3 & 4: For each quality, navigate through download flow
        for (var i = 0; i < qualityLinks.length && i < 2; i++) {
            var qLink = qualityLinks[i];
            console.log("Processing quality:", qLink.quality, qLink.href);

            try {
                // Step 3: GET the quality page (shows "Download File" button)
                speedoHeaders["Referer"] = dUrl;
                var resp2 = axios.get(qLink.href, { headers: speedoHeaders });
                var html2 = resp2.data;

                // Step 4: POST to same page (click "Download File" button)
                speedoHeaders["Referer"] = qLink.href;
                console.log("Step 4: POST to get direct download page");
                var resp3 = axios.post(qLink.href, "imhuman=", { headers: speedoHeaders });
                var html3 = resp3.data;
                var $3 = cheerio.load(html3);

                // Step 5: Find "Direct Download Link"
                $3("a").each(function () {
                    var href = $3(this).attr("href") || "";
                    var text = $3(this).text().trim();

                    if (href.indexOf(".mp4") !== -1 || href.indexOf(".mkv") !== -1 ||
                        href.indexOf("ydc1wes") !== -1 || text.indexOf("Direct Download") !== -1) {
                        console.log("Found direct link:", href.substring(0, 80));
                        streams.push({
                            server: "SpeedoStream " + qLink.quality,
                            link: href,
                            type: "direct",
                            quality: qLink.quality,
                            headers: { "Referer": qLink.href }
                        });
                    }
                });

                // Also check for links in specific patterns
                $3("a[href*='ydc1wes'], a[href*='.mp4'], a[href*='.mkv']").each(function () {
                    var href = $3(this).attr("href") || "";
                    if (href && streams.filter(function (s) { return s.link === href; }).length === 0) {
                        streams.push({
                            server: "SpeedoStream " + qLink.quality,
                            link: href,
                            type: "direct",
                            quality: qLink.quality,
                            headers: { "Referer": qLink.href }
                        });
                    }
                });

            } catch (qErr) {
                console.error("Quality page error:", qErr.message || qErr);
            }
        }

        if (streams.length > 0) {
            console.log("Extracted", streams.length, "direct streams");
            return streams;
        }

        // Fallback: Return browser mode for manual extraction
        console.log("Fallback to Visible Browser");
        return [{
            server: "SpeedoStream (Browser)",
            link: dUrl, // Use the /d/ URL
            type: "browser",
            quality: "HD"
        }];

    } catch (err) {
        console.error("SpeedoStream extraction error:", err);
        return [];
    }
}

/**
 * StreamoUpload Extraction
 * StreamoUpload uses a multi-step form submission flow:
 * 1. Initial page with a form (op, id, hash fields)
 * 2. POST form to get download link
 */
function getStreamoUploadExtraction(link) {
    console.log("StreamoUpload extraction:", link);

    // StreamoUpload is heavily JS-rendered - forms don't exist in initial HTML
    // Use browser mode so user can manually interact with the page
    // Include headers with proper Referer so page loads correctly
    return [{
        server: "StreamoUpload",
        link: link,
        type: "browser",
        quality: "HD",
        headers: {
            "Referer": "https://watchomovies.makeup/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
        }
    }];

    /* OLD CODE - commented out since page is JS-rendered
    try {

        // Fetch initial page
        var html = browser.get(link);
        console.log("StreamoUpload HTML length:", html.length);
        console.log("StreamoUpload HTML preview:", html.substring(0, 500));

        if (!html || html.length < 100) {
            console.error("Empty response from streamoupload");
            return [{
                server: "StreamoUpload",
                link: link,
                type: "browser",
                quality: "HD"
            }];
        }

        var $ = cheerio.load(html);
        var streams = [];

        // Look for the countdown/download form
        var form = $("form").first();
        if (form.length > 0) {
            var action = form.attr("action") || link;
            var method = (form.attr("method") || "POST").toUpperCase();
            console.log("Form found - action:", action, "method:", method);

            // Extract ALL form fields (hidden and visible)
            var formData = {};
            form.find("input").each(function () {
                var name = $(this).attr("name");
                var value = $(this).attr("value") || "";
                if (name) {
                    formData[name] = value;
                    console.log("Form field:", name, "=", value.substring(0, 30));
                }
            });

            // Build POST body
            var postBody = "";
            for (var key in formData) {
                if (postBody) postBody += "&";
                postBody += encodeURIComponent(key) + "=" + encodeURIComponent(formData[key]);
            }
            console.log("POST body:", postBody.substring(0, 100));

            // Submit the form via axios POST
            if (postBody && Object.keys(formData).length > 0) {
                var postUrl = action;
                if (action.indexOf("http") !== 0) {
                    // Relative URL - build absolute
                    var urlMatch = link.match(/^(https?:\/\/[^\/]+)/);
                    if (urlMatch) {
                        postUrl = urlMatch[1] + (action.indexOf("/") === 0 ? action : "/" + action);
                    }
                }

                console.log("Submitting form to:", postUrl);

                var postHeaders = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": link,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "text/html,application/xhtml+xml"
                };

                try {
                    var resp = axios.post(postUrl, postBody, { headers: postHeaders });
                    var html2 = resp.data;
                    console.log("POST response length:", html2.length);

                    var $2 = cheerio.load(html2);

                    // Look for direct download links (often with class or containing 'download')
                    $2("a").each(function () {
                        var href = $2(this).attr("href") || "";
                        var text = $2(this).text().trim().toLowerCase();

                        // Check if it's a video/download link
                        if (href.indexOf(".mp4") !== -1 ||
                            href.indexOf(".mkv") !== -1 ||
                            href.indexOf("download") !== -1 ||
                            text.indexOf("download") !== -1 ||
                            text.indexOf("direct") !== -1) {

                            console.log("Found download link:", href.substring(0, 60));
                            streams.push({
                                server: "StreamoUpload",
                                link: href,
                                type: "direct",
                                quality: "HD",
                                headers: { "Referer": postUrl }
                            });
                        }
                    });

                    // Also check for video URLs in scripts
                    var videoMatch = html2.match(/(?:file|source|src)[\s]*[:=][\s]*["']([^"']+\.(?:mp4|mkv|m3u8)[^"']*)['"]/i);
                    if (videoMatch && videoMatch[1]) {
                        console.log("Found video in script:", videoMatch[1].substring(0, 50));
                        streams.push({
                            server: "StreamoUpload Direct",
                            link: videoMatch[1],
                            type: "direct",
                            quality: "HD"
                        });
                    }

                } catch (postErr) {
                    console.error("POST failed:", postErr.message || postErr);
                }
            }
        }

        // If no streams found, look in the original HTML
        if (streams.length === 0) {
            // Check for direct links
            $("a[href*='.mp4'], a[href*='.mkv'], a[href*='download']").each(function () {
                var href = $(this).attr("href") || "";
                if (href.indexOf("http") === 0 || href.indexOf("/") === 0) {
                    if (href.indexOf("/") === 0) {
                        var base = link.match(/^(https?:\/\/[^\/]+)/);
                        if (base) href = base[1] + href;
                    }
                    streams.push({
                        server: "StreamoUpload",
                        link: href,
                        type: "direct",
                        quality: "HD"
                    });
                }
            });
        }

        if (streams.length > 0) {
            console.log("StreamoUpload streams found:", streams.length);
            return streams;
        }

        // Fallback to browser mode
        console.log("No streams found, fallback to browser");
        return [{
            server: "StreamoUpload",
            link: link,
            type: "browser",
            quality: "HD"
        }];

    } catch (err) {
        console.error("StreamoUpload error:", err.message || err);
        return [{
            server: "StreamoUpload",
            link: link,
            type: "browser",
            quality: "HD"
        }];
    }
    // END OLD CODE */
}

/**
 * StreamWish extraction - uses m3u8 interception for native playback
 */
function getStreamWishExtraction(link) {
    console.log("Creating StreamWish extraction:", link);
    return [{
        server: "StreamWish",
        link: link,
        type: "automate",
        quality: "HD",
        automation: {
            steps: [{ action: "waitForElement", selector: "video", timeout: 15000 }]
        }
    }];
}

/**
 * FileLions extraction - uses m3u8 interception
 */
function getFileLionsExtraction(link) {
    console.log("Creating FileLions extraction:", link);
    return [{
        server: "FileLions",
        link: link,
        type: "automate",
        quality: "HD",
        automation: {
            steps: [{ action: "waitForElement", selector: "video", timeout: 15000 }]
        }
    }];
}

/**
 * StreamTape extraction - uses m3u8 interception
 */
function getStreamTapeExtraction(link) {
    console.log("Creating StreamTape extraction:", link);
    return [{
        server: "StreamTape",
        link: link,
        type: "automate",
        quality: "HD",
        automation: {
            steps: [{ action: "waitForElement", selector: "video", timeout: 15000 }]
        }
    }];
}

/**
 * DoodStream extraction - uses m3u8 interception
 */
function getDoodStreamExtraction(link) {
    console.log("Creating DoodStream extraction:", link);
    return [{
        server: "DoodStream",
        link: link,
        type: "automate",
        quality: "HD",
        automation: {
            steps: [{ action: "waitForElement", selector: "video", timeout: 15000 }]
        }
    }];
}

/**
 * MixDrop extraction - uses m3u8 interception
 */
function getMixDropExtraction(link) {
    console.log("Creating MixDrop extraction:", link);
    return [{
        server: "MixDrop",
        link: link,
        type: "automate",
        quality: "HD",
        automation: {
            steps: [{ action: "waitForElement", selector: "video", timeout: 15000 }]
        }
    }];
}

/**
 * Generic video extraction for unknown players
 */
function getGenericVideoExtraction(link) {
    console.log("Creating generic video extraction:", link);

    return [{
        server: "Video",
        link: link,
        type: "automate",
        automation: {
            steps: [
                // Try to find video element
                {
                    action: "extractUrl",
                    selectors: [
                        "video source[src*='.m3u8']",
                        "video source[src*='.mp4']",
                        "video[src*='.m3u8']",
                        "video[src*='.mp4']",
                        "video source[src]",
                        "video[src]",
                        "source[src]"
                    ],
                    attribute: "src",
                    patterns: [".m3u8", ".mp4", "master"]
                },
                // Try to find in scripts
                {
                    action: "extractFromScript",
                    patterns: [
                        "file:\\s*[\"']([^\"']+\\.m3u8[^\"']*)[\"']",
                        "file:\\s*[\"']([^\"']+\\.mp4[^\"']*)[\"']",
                        "source:\\s*[\"']([^\"']+\\.m3u8[^\"']*)[\"']",
                        "source:\\s*[\"']([^\"']+\\.mp4[^\"']*)[\"']",
                        "src:\\s*[\"']([^\"']+\\.m3u8[^\"']*)[\"']",
                        "src:\\s*[\"']([^\"']+\\.mp4[^\"']*)[\"']",
                        "sources:\\s*\\[\\{[^}]*file:[\"']([^\"']+)[\"']"
                    ]
                }
            ]
        }
    }];
}

/**
 * Try to resolve stream URL directly via HTTP (for simple cases)
 */
function tryDirectExtract(link) {
    try {
        var response = axios.get(link, { headers: headers, timeout: 10000 });
        var html = response.data;

        // Look for m3u8 or mp4 URLs
        var patterns = [
            /file:\s*["']([^"']+\.m3u8[^"']*)['"]}/i,
            /source:\s*["']([^"']+\.m3u8[^"']*)['"]}/i,
            /file:\s*["']([^"']+\.mp4[^"']*)['"]}/i
        ];

        for (var i = 0; i < patterns.length; i++) {
            var match = html.match(patterns[i]);
            if (match && match[1]) {
                console.log("Direct extract found:", match[1].substring(0, 50));
                return [{
                    server: "Direct",
                    link: match[1],
                    type: "direct"
                }];
            }
        }
    } catch (e) {
        console.error("Direct extract failed:", e);
    }

    return null;
}

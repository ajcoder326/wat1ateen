// WatchoMovies Catalog Module - SYNCHRONOUS VERSION for Rhino JS

var catalog = [
    {
        title: "Featured",
        filter: ""
    },
    {
        title: "MISSAX",
        filter: "/director/missax"
    },
    {
        title: "XXX Scenes",
        filter: "/genre/xxx-scenes"
    },
    {
        title: "Desi",
        filter: "/genre/desi"
    },
    {
        title: "18+ Movies",
        filter: "/genre/18"
    },
    {
        title: "Erotic Movies",
        filter: "/genre/erotic-movies"
    },
    {
        title: "Parody",
        filter: "/genre/parody"
    },
    {
        title: "Hot Series",
        filter: "/genre/tv-shows"
    },
    {
        title: "Indian",
        filter: "/genre/indian"
    }
];

var genres = [
    {
        title: "Brazzers",
        filter: "/genre/brazzers"
    },
    {
        title: "Reality Kings",
        filter: "/genre/reality-kings"
    },
    {
        title: "Teamskeet",
        filter: "/genre/teamskeet"
    },
    {
        title: "Digital Playground",
        filter: "/genre/digital-playground"
    },
    {
        title: "Bangbros",
        filter: "/genre/bangbros"
    },
    {
        title: "Vixen",
        filter: "/genre/vixen"
    },
    {
        title: "Naughty America",
        filter: "/genre/naughty-america"
    },
    {
        title: "FakeTaxi",
        filter: "/genre/faketaxi"
    },
    {
        title: "Pure Taboo",
        filter: "/genre/pure-taboo"
    },
    {
        title: "MILF",
        filter: "/genre/milfed"
    },
    {
        title: "Lesbian",
        filter: "/genre/lesbianx"
    },
    {
        title: "Girlsway",
        filter: "/genre/girlsway"
    }
];

var years = [
    { title: "2025", filter: "/release-year/2025" },
    { title: "2024", filter: "/release-year/2024" },
    { title: "2023", filter: "/release-year/2023" },
    { title: "2022", filter: "/release-year/2022" },
    { title: "2021", filter: "/release-year/2021" }
];

var countries = [
    {
        title: "Fliz Movies",
        filter: "/director/fliz-movies"
    },
    {
        title: "Nuefliks",
        filter: "/director/nuefliks-exclusive"
    },
    {
        title: "Hotshots",
        filter: "/director/hotshots"
    },
    {
        title: "Hunters",
        filter: "/director/hunters-originals"
    },
    {
        title: "MoodX",
        filter: "/director/moodx-originals"
    },
    {
        title: "PrimePlay",
        filter: "/director/primeplay-originals"
    },
    {
        title: "Kooku",
        filter: "/director/kooku-originals"
    },
    {
        title: "Rabbit",
        filter: "/director/rabbit-original"
    }
];

function getCatalog() {
    return catalog;
}

function getGenres() {
    return genres;
}

function getYears() {
    return years;
}

function getCountries() {
    return countries;
}

const langs = ["en", "fr", "es", "ru", "jp", "kr", "zh", "hi", "he", "ar"];
let langIndex = 0;
let lang = "en";

let page = 0;
let pageSize = 10;
let numPages = 1;

let airlines = [];
let airports = [];
let airportIndex = {};
let schedule = [];

window.addEventListener("load", async () => {
  await loadData();
  await loadSchedule();
  setInterval(loadSchedule, 60000);

  senza.lifecycle.configure({autoBackground: false});

  animate(createTable());
  setInterval(changePage, 7000);
});

async function loadData() {
  airlines = await (await fetch("/airlines")).json();
  airports = await (await fetch("/airports")).json();
  airports.forEach(airport => airportIndex[airport.code] = airport);
}

async function loadSchedule() {
  schedule = await (await fetch("/schedule")).json();
  schedule.forEach(flight => flight.airport = airportIndex[flight.airport]);
  numPages = schedule.length / pageSize;
}

function createTable(native) {
  let newTable = document.createElement("table");
  newTable.classList.add("table");
  newTable.dir = langIndex < 8 ? "ltr" : "rtl";
  createHeader(newTable);
  let someFlights = schedule.slice(page * pageSize, (page + 1) * pageSize);
  someFlights.forEach(flight => createRow(newTable, flight, native));
  preloadImages(someFlights // preload the featured images for this page
    .filter(flight => flight.airport.featured)
    .map(flight => `wallpaper/${flight.airport.code}.jpg`));
  return newTable;
}

function createHeader(table) {
  const headerRow = table.insertRow();
  const labels = ["time", "flight", "destination", "gate", "remarks"];
  labels.forEach(label => {
    const cell = headerRow.insertCell();
    cell.classList.add(label, lang);
    cell.appendChild(document.createTextNode(strings[label][lang]));
  });
}

function flightData(flight, native) {
  let country = flight.airport.country.toLowerCase();
  native = native && (lang == "en" || lang == "ru") && flight.airport.native;
  return [{key: "time", text: formatTime(new Date(flight.time))},
    {key: "flight", text: flight.airline + flight.flight, 
      icon: `logos/${flight.airline}.png`,
      style: flight.airline},
    {key: "destination", 
      text: native ? flight.airport.native : flight.airport.names[lang],
      icon: `https://flagpedia.net/data/flags/w160/${country}.webp`,
      style: country},
    {key: "gate", text: flight.gate},
    {key: "remarks", text: strings[flight.remarks][lang] + delayTime(flight)}];
}

function createRow(table, flight, native) {
  const row = table.insertRow();
  flightData(flight, native).forEach(data => {
    const cell = row.insertCell();
    cell.classList.add(data.key, table.dir);
    if (!["time", "flight", "gate"].includes(data.key)) cell.classList.add(lang);
    if (native && data.key == "destination" && flight.airport.lang) cell.classList.add(flight.airport.lang);
    if (data.icon) {
      const img = document.createElement("img");
      img.src = data.icon;
      img.classList.add(data.style)
      cell.appendChild(img);
    }
    cell.appendChild(document.createTextNode(data.text));
  });
}

let wallpaperFlight = null;
function createWallpaper(flight) {
  wallpaperFlight = flight || featuredFlight();
  let airport = wallpaperFlight.airport;
  let page = document.createElement("div");
  page.classList.add("wallpaper");
  let wallpaper = document.createElement("img");
  wallpaper.src = `wallpaper/${airport.code}.jpg`;
  wallpaper.classList.add("wallpaper");
  page.appendChild(wallpaper);
  let native = false;
  
  // if the airport has a native name but we don't support the native language,
  // then use the native name and switch to English for the remarks.
  if (airport.native && !airport.lang && lang != "en") {
    native = true;
    setLangIndex(0);
  }
  
  let miniTable = document.createElement("table");
  miniTable.classList.add("mini-table");
  miniTable.dir = langIndex < 8 ? "ltr" : "rtl";
  createRow(miniTable, wallpaperFlight, native);
  page.appendChild(miniTable);

  return page;
}

// returns a flight to a featured destination from the current page, otherwise from any page
function featuredFlight() {
  let someFlights = schedule.slice(page * pageSize, (page + 1) * pageSize); 
  let featuredFlights = someFlights.filter(flight => flight.airport.featured);
  if (featuredFlights.length == 0) featuredFlights = schedule.filter(flight => flight.airport.featured);
  return randomObject(featuredFlights);
}

let oldPage = null;
function animate(newPage, duration = 1.0, newName = "dissolve", oldName = null) {
  main.appendChild(newPage);
  if (oldPage) {
    newPage.style.zIndex = 2;
    oldPage.style.zIndex = 1;
    newPage.style.animationName = newName;
    if (oldName) oldPage.style.animationName = oldName;
    newPage.style.animationDuration = duration + "s";
    if (oldName) oldPage.style.animationDuration = duration + "s";
  }
  
  setTimeout(() => {
    if (oldPage) main.removeChild(oldPage);
    oldPage = newPage;
  }, duration * 1000);
}

function formatTime(date) {
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

function delayTime(flight) {
  if (flight.remarks != "delayed") return "";
  let oldTime = new Date(flight.time);
  let newTime = new Date(oldTime.getTime() + flight.delay * 60000);
  return " " + formatTime(newTime);
}

function preloadImages(images) {
  images.forEach(image => {
    let img = new Image();
    img.src = image;
  });
}

document.addEventListener("keydown", async function(event) {
	switch (event.key) {
    case "Enter": animate(createWallpaper(), 2.0, "dissolve-in"); break;
    case "Escape": break;
    case "ArrowLeft": prevPage(); break;
    case "ArrowRight": nextPage(); break;      
    case "ArrowUp": prevLang(); break;      
    case "ArrowDown": nextLang(); break;      
		default: return;
	}
	event.preventDefault();
});

function prevLang() {
  setLangIndex((langIndex - 1 + langs.length) % langs.length);
  animate(createTable(), 1.0, "dissolve");
}

function nextLang() {
  setLangIndex((langIndex + 1) % langs.length);
  animate(createTable(), 1.0, "dissolve");
}

function setLangIndex(value) {
  langIndex = value;
  lang = langs[langIndex];
}

function prevPage() {
  page = (page - 1 + numPages) % numPages;
  animate(createTable(), 1.5, `slide-prev`, `slide-prev-old`);
}

function nextPage() {
  page = (page + 1) % numPages;
  animate(createTable(), 1.5, `slide-next`, `slide-next-old`);
}

/* the app changes between the following pages:
  1. Flights in English
  2. Flights in English with native city names
  3. Wallaper in:
    a. Local language if supported
    b. else English with native city name
    c. else random non-English language
  4. Wallpager in English
  5. Flights in random non-English language
  6. Flights in English (reprise)
*/
let tick = 0;
function changePage() {
  tick++;
  switch (tick % 6) {
  case 0: 
    setLangIndex(0);
    nextPage(); 
    break;
  case 1:
    animate(createTable(true));
    break;
  case 2:
    let flight = featuredFlight();
    setLangIndex(flight?.airport?.lang ? langs.indexOf(flight.airport.lang) : randomNumber(1,9));  
    animate(createWallpaper(flight), 1.0, "dissolve-in");
    break;
  case 3:
    setLangIndex(0);
    animate(createWallpaper(wallpaperFlight));
    break;
  case 4:
    setLangIndex(randomNumber(1,9));
    animate(createTable(), 1.0, "dissolve", "out");
    break;
  case 5: 
    setLangIndex(0);
    animate(createTable());
    break;
  }
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomObject(array) {
  if (array.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

const express = require("express");
const errorHandler = require('errorhandler');
const port = 8080;
const airlines = require("./airlines.json").airlines;
const airports = require("./airports.json").airports;
const config = require("./config.json");

const app = express();

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(errorHandler({dumpExceptions: true, showStack: true}));

const server = app.listen(port, () => console.log("Flights running on port " + port));

let airlinesByCountry = groupByCountry(airlines);
let airportsByCountry = groupByCountry(airports);
let airportIndex = {}
airports.forEach(airport => airportIndex[airport.code] = airport);

let schedule = [];
function createSchedule() {
  schedule = [];
  let now = new Date();
  for (let i = 0; i < config.numFlights; i++) {
    let airport = randomObject(airports);
    let airline = randomObject(airlinesByCountry[airport.country] || airlines);
    let flight = {
      "time": randomTime(2),
      "airline": airline.code,
      "flight": zeroPad(randomNumber(100, 5000), 4),
      "airport": airport.code,
      "gate": randomObject(config.terminals) + zeroPad(randomNumber(1, config.maxGate), 2),
      "delay": randomNumber(1,config.delayChance) == 1 ? randomNumber(1,config.maxDelay) : 0,
      "cancelled": randomNumber(1,config.cancelledChance) == 1
    };
    schedule.push(flight);
  }
  schedule.sort((a,b) => a.time - b.time);
}
createSchedule();
setInterval(updateRemarks, config.refreshScheduleHours * 3600000);

function updateRemarks() {
  let now = new Date();
  schedule.forEach(flight => {
    flight.minutes = Math.floor((flight.time.getTime() - now.getTime()) / 60000) + flight.delay;
    let newRemarks = flight.cancelled ? "cancelled" : remarks(flight.minutes, flight.delay);
    flight.remarks = newRemarks;
  });
}
updateRemarks();
setInterval(updateRemarks, config.updateRemarksSeconds * 1000);

app.get("/airlines", async (req, res) => {
    res.status(200).json(airlines);
});

app.get("/airports", async (req, res) => {
    res.status(200).json(airports);
});

app.get("/schedule", async (req, res) => {
  let filtered = schedule.filter(flight => flight.minutes > config.filterStart);
  if (filtered.length > config.maxResults) filtered = filtered.slice(0, config.maxResults);
  res.status(200).json(filtered);
});

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomObject(array) {
  if (array.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

function groupByCountry(objects) {
  const results = {};
  objects.forEach(obj => {
    let country = obj.country;
    if (!results[country]) results[country] = [];
    results[country].push(obj);
  });
  return results;
}

function randomTime(days) {
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + days - 1);
  end.setHours(23, 59, 59, 999);

  const time = new Date(randomNumber(start.getTime(), end.getTime()));
  const minutes = time.getMinutes();
  const roundedMinutes = Math.round(minutes / 5) * 5;
  time.setMinutes(roundedMinutes);
  time.setSeconds(0);
  time.setMilliseconds(0);
  return time;
}

function zeroPad(number, length) {
  return number.toString().padStart(length, "0");
}

function remarks(minutes, delay) {
  if (minutes < config.filterStart) {
    return "done";
  } else if (minutes < 0) {
    return "departed";
  } else if (minutes < 20) {
    return "closed";
  } else if (minutes < 30) {
    return "finalcall";
  } else if (minutes < 60) {
    return "boarding";
  } else if (minutes < 90) {
    return "gogate";
  } else if (delay) {
    return "delayed";
  } else if (minutes < 180) {
    return "checkin";
  } else {
    return "ontime";
  }
}
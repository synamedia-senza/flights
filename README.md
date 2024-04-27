# Flights

An airport digital signage demo that shows flight departures.

See the [Airport Signage](https://developer.synamedia.com/senza/docs/flights) tutorial in the Senza developer documentation.

## Build

```bash
npm install

cd public
npm install
npm ci
npx webpack --config webpack.config.js
cd ..
```

## Run

```
node server.js
ngrok http 8080
```
Open the link shown by ngrok on a Senza device.


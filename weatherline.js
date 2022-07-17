/**
 * Scriptable Weather Line widget
 * <https://github.com/jamesramsay/weatherline>
 * By James Ramsay.
 */

// Development configuration
const debugParams = {
  //locationGeohash: 'r1r14c',
  screenSize: new Size(414, 896),
  debugBorders: false,
};

const DEFAULTS = {
  layout: 'daily',

  // Development configs
  widgetFamily: config.widgetFamily || 'medium',
  screenSize: Device.screenSize(),

  // twelveHours: defines if the hours are displayed in a 12h format, use false for 24h format.
  twelveHours: true,
  // roundedGraph:
  // - true: Use rounded values to draw the graph.
  // - false: Draws the graph using decimal values, this can be used to draw an smoother line.
  roundedGraph: false,
  // roundedTemp: displays the temps rounding the values (29.8 = 30 | 29.3 = 29)
  roundedTemp: true,

  widgetPadding: 16,
  headerFontSize: 12,
  symbolFontSize: 18,
  tempFontSize: 16,
};

function formatHours(hour) {
  if (cfg.twelveHours != true) return hour;
  switch (hour) {
    case 0:
      return '12a';
    case 12:
      return '12p';
    default:
      return hour % 12;
  }
}

const WIDGET_FAMILY_DEFAULTS = {
  small: {
    daily: {
      nowString: 'Today',
      pointsToShow: 4,
      getTemp: (forecast) => forecast.temp_max,
      getAxisLabel: (forecast) => parseDate(forecast.date).getDate(),
    },
    hourly: {
      nowString: 'Now',
      pointsToShow: 4,
      getTemp: (forecast) => forecast.temp,
      getAxisLabel: (forecast) => formatHours(parseDate(forecast.time).getHours()),
    },
  },
  medium: {
    daily: {
      nowString: 'Today',
      pointsToShow: 7,
      getTemp: (forecast) => forecast.temp_max,
      getAxisLabel: (forecast) => parseDate(forecast.date).getDate(),
    },
    hourly: {
      nowString: 'Now',
      pointsToShow: 10,
      getTemp: (forecast) => forecast.temp,
      getAxisLabel: (forecast) => formatHours(parseDate(forecast.time).getHours()),
    },
  },
}

async function getCfg() {
  let widgetParams = {};

  // Detect development environment based on device name
  if (Device.name() == 'Remote FlatMac') widgetParams = debugParams;

  // Avoid trying to parse null or empty strings
  if (args.widgetParameter) widgetParams = JSON.parse(args.widgetParameter);

  let cfg = {
    ...DEFAULTS,
    ...WIDGET_FAMILY_DEFAULTS[DEFAULTS.widgetFamily],
    ...widgetParams,
  }

  cfg.contextSize = getWidgetSizeInPoints(cfg.widgetFamily, cfg.screenSize);

  if (Object.hasOwn(cfg, 'locationGeohash') == false) {
    cfg.locationGeohash = await getLocationGeohash();
  }

  return cfg
}

let cfg = {}

function newGradient(startColor, endColor) {
  const gradient = new LinearGradient();
  gradient.colors = [startColor, endColor];
  gradient.locations = [0.0, 1];

  return gradient;
}

const COLORS = {
  day: {
    bgGradient: newGradient(new Color('#4B8AB4'), new Color('#76A6C6')),
    bgColor: new Color('#5695BD'),
    fgColor: new Color('#FFFFFF'), // 027DB7'),
    dayColor: new Color('#F0C40F'),
    nightColor: new Color('#FFFFFF'),
    rainColor: new Color('#FFFFFF'),
    snowColor: new Color('#FFFFFF'),
    heatColor: new Color('#F0C40F'),
  },
  night: {
    bgGradient: newGradient(new Color('#18182D'), new Color('#282C42')),
    bgColor: new Color('#262626'),
    fgColor: new Color('#949494'),
    dayColor: new Color('#FE9C00'),
    nightColor: new Color('#999999'),
    rainColor: new Color('#2893DE'),
    snowColor: new Color('#2893DE'),
    heatColor: new Color('#F45246'),
  },
};
const COLOR_SCHEME = 'day';

let colorscheme = COLORS[COLOR_SCHEME];


const SYMBOL_MAP = {
    clear: {
      day: "sun.max.fill",
      night: "moon.stars.fill",
    },
    cloudy: {
      night: "cloud.fill",
      day: "cloud.fill",
    },
    cyclone: {
      day: "tropicalstorm",
    },
    dust: {
      day: "sun.dust.fill",
    },
    dusty: {
      day: "sun.dust.fill",
    },
    fog: {
      day: "cloud.fog.fill",
    },
    frost: {
      day: "sparkles",
    },
    haze: {
      night: "moon.haze.fill",
      day: "sun.haze.fill",
    },
    hazy: {
      night: "moon.haze.fill",
      day: "sun.haze.fill",
    },
    heavy_shower: {
      day: "cloud.heavyrain.fill",
    },
    heavy_showers: {
      day: "cloud.heavyrain.fill",
    },
    light_rain: {
      day: "cloud.drizzle.fill",
    },
    light_shower: {
      day: "cloud.sun.rain.fill",
      night: "cloud.moon.rain.fill",
    },
    light_showers: {
      day: "cloud.sun.rain.fill",
      night: "cloud.moon.rain.fill",
    },
    mostly_sunny: {
      night: "cloud.moon.fill",
      day: "cloud.sun.fill",
    },
    partly_cloudy: {
      night: "cloud.moon.fill",
      day: "cloud.sun.fill",
    },
    rain: {
      day: "cloud.heavyrain.fill",
    },
    shower: {
      day: "cloud.sun.rain.fill",
      night: "cloud.moon.rain.fill",
    },
    showers: {
      day: "cloud.sun.rain.fill",
      night: "cloud.moon.rain.fill",
    },
    snow: {
      day: "snow",
    },
    storm: {
      day: "cloud.bolt.rain.fill",
    },
    storms: {
      day: "cloud.bolt.rain.fill",
    },
    sunny: {
      day: "sun.max.fill",
    },
    tropical_cyclone: {
      day: "hurricane",
    },
    wind: {
      day: "wind",
    },
    windy: {
      day: "wind",
    },
}


/**
 * Cache
 *
 * Implementation of a simple cache using FileManager.cacheDirectory.
 *
 */
const secondsSinceEpoch = () => Math.round(Date.now() / 1000);
const Cache = {
  directory: 'cache_WeatherLine',
  keyMatch: (f, key) => f.match(new RegExp(`^\\d+[.]${key}$`)),
  keyNotExpired: (f) => f.split('.', 1) > secondsSinceEpoch(),
  secondsInMinute: 60,
};

/**
 * Returns a cache hit if not expired.
 *
 * @param {string} key - The key of the cached item.
 * @returns {object} - The cached item.
 */
Cache.read = function (key) {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.cacheDirectory(), Cache.directory);

  if (!fm.fileExists(cachePath)) return;

  const f = fm.listContents(cachePath)
    .filter(f => Cache.keyMatch(f, key) && Cache.keyNotExpired(f))
    .map(f => fm.joinPath(cachePath, f))
    .find(f => fm.fileExists(f));

  if (f == null) return;

  const v = fm.readString(f);
  const o = JSON.parse(v);

  console.log(`Cache hit: ${f}`);
  return o;
}

/**
 * Updates cache
 *
 * @param {string} key - The key of the item to be cached.
 * @param {object} item - The item to be cached.
 * @param {number} ttl - The number of seconds the cached data should be retained.
 */
Cache.write = function(key, item, ttl = 60) {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.cacheDirectory(), Cache.directory);

  if (!fm.fileExists(cachePath)) {
    fm.createDirectory(cachePath);
  }

  const staleFiles = fm.listContents(cachePath)
    .filter(f => Cache.keyMatch(f, key))
    .map(f => fm.joinPath(cachePath, f))

  const filename = `${secondsSinceEpoch() + ttl}.${key}`;
  const f = fm.joinPath(cachePath, filename);
  const str = JSON.stringify(item);
  fm.writeString(f, str);

  // Remove stale files after updating the cache
  staleFiles.forEach((f) => fm.remove(f));
}

/**
 * Set up cache. File located in the Scriptable iCloud folder
 *
 * @param {string} location - The 6 character long geohash string.
 * @returns {object} - The weather data which may be cached.
 */
async function getWeatherData(location) {
  let weatherData = Cache.read(`forecast.${location}.json`)

  if (weatherData == null) {
    try {
      weatherData = await fetchWeatherData(location);
      Cache.write(`forecast.${location}.json`, weatherData);
    } catch (err) {
      console.log(err);
    }
  }
  return weatherData;
}


async function main() {
  cfg = await getCfg();
  console.log(cfg);

  const weatherData = await getWeatherData(cfg.locationGeohash);
  colorscheme = weatherData.hourly[0].is_night ? COLORS['night'] : COLORS['day'];

  const widget = new ListWidget();
  widget.setPadding(cfg.widgetPadding, cfg.widgetPadding, 0, cfg.widgetPadding);
  widget.backgroundGradient = colorscheme.bgGradient;

  const rowStack = widget.addStack();
  rowStack.layoutVertically();
  rowStack.topAlignContent();
  rowStack.setPadding (0,0,0,0);
  addHourlyStack(rowStack, weatherData);
  rowStack.addSpacer();

  switch (cfg.widgetFamily) {
    case 'small':
      widget.presentSmall();
      break;
    case 'medium':
      widget.presentMedium();
      break;
    case 'large':
      widget.presentLarge();
      break;
  }

  Script.complete();

  // Functions

  // if (size_large) {
  //   drawText(
  //     feelsstring +
  //       " " +
  //       Math.round(weatherData.current.temp_feels_like) +
  //       "° | " +
  //       relHumidity +
  //       " " +
  //       weatherData.current.humidity +
  //       "% | " +
  //       pressure +
  //       " " +
  //       weatherData.current.pressure +
  //       "hPa | " +
  //       windspeed +
  //       " " +
  //       weatherData.current.wind.speed_kilometre +
  //       "km/h",
  //     footerFontSize,
  //     feelsLikeCoords.x,
  //     feelsLikeCoords.y,
  //     Color.gray()
  //   );
  // } else {
  //   drawText(
  //     feelsstring +
  //       " " +
  //       Math.round(weatherData.current.temp_feels_like) +
  //       "° | " +
  //       relHumidity +
  //       " " +
  //       weatherData.current.humidity +
  //       "%",
  //     footerFontSize,
  //     feelsLikeCoords.x,
  //     feelsLikeCoords.y,
  //     Color.gray()
  //   );
  // }

  // drawContext.setTextAlignedRight();
  // drawTextC(
  //   parseDate(weatherData.current.time).toLocaleTimeString("fr-FR", {
  //     hour: "2-digit",
  //     minute: "2-digit",
  //   }),
  //   footerFontSize,
  //   lastUpdateTimePosAndSize.x,
  //   lastUpdateTimePosAndSize.y,
  //   lastUpdateTimePosAndSize.width,
  //   lastUpdateTimePosAndSize.height,
  //   Color.gray()
  // );

  // if (usingCachedData)
  //   drawText(
  //     "⚠️",
  //     32,
  //     contextWidth - 72,
  //     30
  //   );


}

// Hourly stack contains temp chart
function addHourlyStack(parentStack, weatherData) {
  const hourlyStack = parentStack.addStack()
  hourlyStack.setPadding(0,0,0,0);
  hourlyStack.layoutVertically();
  hourlyStack.topAlignContent();

  const headerStack = hourlyStack.addStack()
  headerStack.setPadding(0,0,0,0);
  headerStack.layoutHorizontally();
  headerStack.topAlignContent();

  const textStack = headerStack.addStack()
  textStack.setPadding(0,0,0,0);
  textStack.layoutVertically();
  textStack.topAlignContent();

  const heading = textStack.addText(weatherData.location.name);
  heading.textColor = colorscheme.fgColor;
  heading.font = Font.semiboldSystemFont(cfg.headerFontSize);
  heading.minimumScaleFactor = 1;

  const subheading = textStack.addText(weatherData.daily[0].short_text);
  subheading.textColor = colorscheme.fgColor;
  subheading.font = Font.regularSystemFont(cfg.headerFontSize);
  subheading.minimumScaleFactor = 1;

  headerStack.addSpacer();

  const chartStack = hourlyStack.addStack();
  chartStack.setPadding(0,0,0,0);
  chartStack.layoutHorizontally();

  const chartWidth = cfg.contextSize.width - cfg.widgetPadding * 2;
  const chartHeight = cfg.contextSize.height - cfg.widgetPadding * 2 - cfg.headerFontSize * 2;
  const chartSize = new Size(chartWidth, chartHeight);
  const chartData = weatherData[cfg.layout];
  const chartPoints = Math.min(chartData.length, cfg[cfg.layout].pointsToShow);
  const chartOptions = cfg[cfg.layout];
  const chartImage = drawChartImage(chartData, chartPoints, chartOptions, chartSize)
  chartStack.addImage(chartImage);
}

/**
* Draws debug borders around elements to help refine the layout
*
* @param {object} e
* @returns {object}
*/
function drawDebugBorder(ctx, rect) {
  if (cfg.debugBorders != true) return;

  ctx.setLineWidth(1);
  ctx.setStrokeColor(Color.red());
  ctx.strokeRect(rect);
}

function parseDate(dt) {
  return new Date(dt);
}

function drawImage(ctx, image, x, y) {
  ctx.drawImageAtPoint(image, new Point(x, y));
}

function getWidgetSizeInPoints(widgetFamily, screenSize) {
  console.log({widgetFamily, screenSize});

  // RegExp to verify widgetSize
  const sizes = /^(?:small|medium|large)$/;

  // stringify device screen size
  const devSize = (({width: w, height: h}) => w > h ? `${h}x${w}` : `${w}x${h}`)(screenSize);

  // Source: https://developer.apple.com/design/human-interface-guidelines/components/system-experiences/widgets/#specifications
  const sizeMap = {
    // iOS
    '428x926': { small: [170, 170], medium: [364, 170], large: [364, 382] },
    '414x896': { small: [169, 169], medium: [360, 169], large: [360, 376] },
    '414x736': { small: [159, 159], medium: [348, 159], large: [348, 357] },
    '390x844': { small: [158, 158], medium: [338, 158], large: [338, 354] },
    '375x812': { small: [155, 155], medium: [329, 155], large: [329, 345] },
    '375x667': { small: [148, 148], medium: [322, 148], large: [322, 324] },
    '360x780': { small: [155, 155], medium: [329, 155], large: [329, 345] },
    '320x568': { small: [141, 141], medium: [292, 141], large: [292, 311] },
    // iPadOS
    // '768x1024': { small: [], medium: [], large: [], extraLarge: [] },
    // '744x1133': { small: [], medium: [], large: [], extraLarge: [] },
    // '810x1080': { small: [], medium: [], large: [], extraLarge: [] },
    // '820x1180': { small: [], medium: [], large: [], extraLarge: [] },
    // '834x1112': { small: [], medium: [], large: [], extraLarge: [] },
    '834x1194': { small: [136, 136], medium: [300, 136], large: [300, 300], extraLarge: [628, 300] },
    // '954x1373': { small: [], medium: [], large: [], extraLarge: [] },
    // '970x1389': { small: [], medium: [], large: [], extraLarge: [] },
    '1024x1366': { small: [160, 160], medium: [356, 160], large: [356, 356], extraLarge: [748, 356] },
    // '1192x1590': { small: [], medium: [], large: [], extraLarge: [] },
  }
  let widgetSizeInPoint = null

  if (sizes.test(widgetFamily)) {
    let mappedSize = sizeMap[devSize]
    if (mappedSize) {
      widgetSizeInPoint = new Size(...mappedSize[widgetFamily])
    }
  }

  return widgetSizeInPoint
}

// Fetching should normalize to a simplified format
async function fetchWeatherData(geohash) {
  // Undocumented BOM API
  // Example: https://weather.bom.gov.au/location/r1r14cw-carlton-north
  console.log(`Fetching BOM forecasts for ${geohash}...`);
  const [
    locationData,
    observationData,
    hourlyData,
    dailyData,
  ] = await Promise.all([
    new Request(`https://api.weather.bom.gov.au/v1/locations/${geohash}`).loadJSON(),
    new Request(`https://api.weather.bom.gov.au/v1/locations/${geohash}/observations`).loadJSON(),
    new Request(`https://api.weather.bom.gov.au/v1/locations/${geohash}/forecasts/hourly`).loadJSON(),
    new Request(`https://api.weather.bom.gov.au/v1/locations/${geohash}/forecasts/daily`).loadJSON(),
  ]);

  const weatherData = {
    location: locationData.data,
    current: observationData.data,
    hourly: hourlyData.data,
    daily: dailyData.data,
  };

  return weatherData;
}

/**
 * Draws a chart of hourly and daily forecasts.
 *
 * @param {object} data - The forecast data to display.
 * @param {number} pointsToShow - The number of data points to show.
 * @param {function} axisLabelFn - A function that takes a data point and returns a label.
 * @param {number} w - The width of the chart to draw.
 * @param {number} h - The height of the chart to draw.
 * @returns {Image}
 */
function drawChartImage(data, pointsToShow, opts, chartSize) {
  const ctx = new DrawContext();
  ctx.size = chartSize;
  ctx.opaque = false;
  ctx.setTextAlignedCenter();
  ctx.respectScreenScale = true;

  const tempFontSize = cfg.tempFontSize;
  const lineStrokeWidth = 3;
  const symbolFontSize = cfg.symbolFontSize;
  const axisFontSize = cfg.headerFontSize;
  const axisFontColor = colorscheme.fgColor;
  const axisFontWeight = 'regular';
  const axisOffset = ctx.size.height - axisFontSize * 1.5;

  let min, max, diff;
  for (let i = 0; i < pointsToShow; i++) {
    const temp = shouldRound(cfg.roundedGraph, opts.getTemp(data[i]));
    min = temp < min || min == undefined ? temp : min;
    max = temp > max || max == undefined ? temp : max;
  }
  diff = max - min;

  const lowerLineLimit = ctx.size.height - axisFontSize * 1.5 - symbolFontSize;
  const upperLineLimit = 0 + tempFontSize * 2.5;
  const unitHeight = lowerLineLimit - upperLineLimit;
  const unitWidth = ctx.size.width / pointsToShow;

  for (let i = 0; i < pointsToShow; i++) {
    const forecast = data[i];
    const temp = opts.getTemp(forecast);
    const axisLabel = opts.getAxisLabel(forecast);

    // Vertically center line when diff == 0 (all temperatures are the same)
    const delta = diff > 0 ? (shouldRound(cfg.roundedGraph, temp) - min) / diff : 0.5;

    const x1 = unitWidth * i + unitWidth / 2;
    const y1 = lowerLineLimit - unitHeight * delta;

    // Do not draw line from last element to element after
    if (i < pointsToShow - 1) {
      const nextTemp = shouldRound(cfg.roundedGraph, opts.getTemp(data[i + 1]));
      const nextDelta = diff > 0 ? (nextTemp - min) / diff : 0.5;
      const x2 = unitWidth * (i + 1) + unitWidth / 2;
      const y2 = lowerLineLimit - unitHeight * nextDelta;

      drawLine(
        ctx,
        x1, y1, x2, y2, lineStrokeWidth, colorForCondition(forecast));
    }

    // Symbol
    const symbol = symbolForCondition(forecast);
    drawImage(
      ctx,
      symbol,
      x1 - symbol.size.width / 2,
      y1 - symbol.size.height / 2,
    );

    // Temperature text
    const labelFontSize = tempFontSize * (i > 0 ? 1 : 1.5);
    drawTextC(
      ctx,
      shouldRound(cfg.roundedTemp, temp),
      labelFontSize,
      // x
      unitWidth * i,
      // y
      y1 - symbolFontSize * 1.2 - labelFontSize,
      // width
      unitWidth,
      // height
      labelFontSize,
      colorForCondition(forecast),
      'regular'
    );

    // Axis text
    const label = i == 0 ? opts.nowString : axisLabel;
    drawTextC(ctx, label, axisFontSize,
      unitWidth * i, axisOffset, // x, y
      unitWidth, axisFontSize * 1.5, // h, w
      axisFontColor, axisFontWeight );
  }

  return ctx.getImage()
}

function drawTextC(
  ctx,
  text,
  fontSize,
  x,
  y,
  w,
  h,
  color = Color.black(),
  fontWeight = "bold"
) {
  ctx.setFont(Font[fontWeight + "SystemFont"](fontSize));
  ctx.setTextColor(color);
  const rect = new Rect(x, y, w, h);
  ctx.drawTextInRect(
    new String(text).toString(),
    rect
  );

  drawDebugBorder(ctx, rect);
}

function drawLine(ctx, x1, y1, x2, y2, width, color) {
  const path = new Path();
  path.move(new Point(x1, y1));
  path.addLine(new Point(x2, y2));
  ctx.addPath(path);
  ctx.setStrokeColor(color);
  ctx.setLineWidth(width);
  ctx.strokePath();
}

function shouldRound(should, value) {
  return should ? Math.round(value) : value;
}

// SFSymbol function
function symbolForCondition(forecast) {
  let sfs = SFSymbol.named("wind");
  if (typeof SYMBOL_MAP[forecast.icon_descriptor] == "object") {
    sfs = SFSymbol.named((forecast.is_night && SYMBOL_MAP[forecast.icon_descriptor].night) || SYMBOL_MAP[forecast.icon_descriptor].day);
  }

  sfs.applyFont(Font.systemFont(cfg.symbolFontSize));
  return sfs.image;
}

function colorForCondition(forecast) {
  // Night
  if (forecast.is_night == true) return colorscheme.nightColor;

  // Rain or Snow
  if (forecast.rain.chance >= 20) return colorscheme.rainColor;

  // Extreme Heat
  if (forecast.temp >= 35) return colorscheme.heatColor;

  return colorscheme.dayColor;
}

async function getLocationGeohash() {
  const cacheKey = 'current_location.json';
  let l = Cache.read(cacheKey);

  if (l == null) {
    Location.setAccuracyToKilometer()
    l = await Location.current();
    Cache.write(cacheKey, l, Cache.secondsInMinute * 60);
  }

  return encodeGeohash(l.latitude, l.longitude, 6);
}

/**
 * Encodes latitude/longitude to geohash, either to specified precision or to automatically
 * evaluated precision.
 *
 * @param   {number} lat - Latitude in degrees.
 * @param   {number} lon - Longitude in degrees.
 * @param   {number} [precision] - Number of characters in resulting geohash.
 * @returns {string} Geohash of supplied latitude/longitude.
 * @throws  Invalid geohash.
 * @example
 *     var geohash = Geohash.encode(52.205, 0.119, 7); // geohash: 'u120fxw'
 */
function encodeGeohash(lat, lon, precision = 6) {
  /* Geohash-specific Base32 map */
  const geohashBase32 = '0123456789bcdefghjkmnpqrstuvwxyz';

  lat = Number(lat);
  lon = Number(lon);
  precision = Number(precision);

  if (isNaN(lat) || isNaN(lon) || isNaN(precision)) throw new Error('Invalid geohash');

  var idx = 0; // index into base32 map
  var bit = 0; // each char holds 5 bits
  var evenBit = true;
  var geohash = '';

  var latMin =  -90, latMax =  90;
  var lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
      if (evenBit) {
          // bisect E-W longitude
          var lonMid = (lonMin + lonMax) / 2;
          if (lon >= lonMid) {
              idx = idx*2 + 1;
              lonMin = lonMid;
          } else {
              idx = idx*2;
              lonMax = lonMid;
          }
      } else {
          // bisect N-S latitude
          var latMid = (latMin + latMax) / 2;
          if (lat >= latMid) {
              idx = idx*2 + 1;
              latMin = latMid;
          } else {
              idx = idx*2;
              latMax = latMid;
          }
      }
      evenBit = !evenBit;

      if (++bit == 5) {
          // 5 bits gives us a character: append it and start over
          geohash += geohashBase32.charAt(idx);
          bit = 0;
          idx = 0;
      }
  }

  return geohash;
}

/**
 * Forecast interface permits multiple forecaster implementations with differing data structures
 */

/**
 * Bureau of Meteorology (BOM) forecaster implementation
 */
const Forecast = {
  _geohash: '',
  locationName: '',
  fetchedAt: '', // The time when the forecast was last fetched from the forecaster.
  updatedAt: '', // The time when the forecast was last updated by the forecaster.
  hourly: [],
  daily: [],
}

Forecast.fetch = () => { return 'test' };




module.exports = {
  main,
};

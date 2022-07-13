// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: magic;

// Widget Params
// Don't edit this, those are default values for debugging (location for Cupertino).
// You need to give your locations parameters through the widget params, more info below.

// Development configuration
const debugParams = JSON.stringify({
  BOM_GEO_HASH: "r1r14c",
  locationName: "Carlton North",
  widgetSize: "medium",
  screenSize: new Size(414, 896),
});

const widgetParams = JSON.parse(
  args.widgetParameter != null ? args.widgetParameter : debugParams
);

console.log(widgetParams);

function newGradient(startColor, endColor) {
  const gradient = new LinearGradient();
  gradient.colors = [startColor, endColor];
  gradient.locations = [0.0, 1];

  return gradient;
}

const configWL = {
  twelveHours: true,
  roundedGraph: true,
  roundedTemp: true,
  small: {
    hoursToShow: 4,
    daysToShow: 4,
  },
  medium: {
    hoursToShow: 10,
    daysToShow: 10,
  },
  headerFontSize: 12,
  symbolFontSize: 18,
  tempFontSize: 16,
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
    bgGradient: newGradient(new Color('#4B8AB4'), new Color('#76A6C6')),
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
const colorscheme = COLORS[COLOR_SCHEME];

const widgetSize = config.widgetFamily || widgetParams.widgetSize;

const ENABLE_DEBUG_BORDERS = false;

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

async function newMain() {
  const weatherData = getWeatherData(location);

  const presentFn = {
    'small': widget.presentSmall,
    'medium': widget.presentMedium,
    'large': widget.presentLarge,
  }
  presentFn[widgetFamily]();

  return widget
}

// Set up cache. File located in the Scriptable iCloud folder
async function getWeatherData(location = "r1r14c") {
  const cacheKey = `latest_${location}.json`;
  const cacheDir = 'cacheWeatherLine';

  const fm = FileManager.iCloud();
  const cachePath = fm.joinPath(fm.documentsDirectory(), cacheDir);

  if (!fm.fileExists(cachePath)) {
    fm.createDirectory(cachePath);
  }

  let weatherData = {};
  try {
    weatherData = await fetchWeatherData(location);

    // Update cache
    fm.writeString(
      fm.joinPath(cachePath, cacheKey),
      JSON.stringify(weatherData)
    );

    weatherData.fromCache = false;
  } catch (err) {
    console.log("Warning: Offline mode");
    console.log(err);
    try {
      await fm.downloadFileFromiCloud(fm.joinPath(cachePath, cacheKey));
      let raw = fm.readString(fm.joinPath(cachePath, cacheKey));

      weatherData = JSON.parse(raw);
      weatherData.fromCache = true;
    } catch (ex) {
      console.log("Error: No offline data cached");
      console.log(ex);
    }
  }

  return weatherData;
}


async function main() {
  // String customization
  const nowstring = "Now"; // Your local term for "now"

  // twelveHours : true|false > Defines if the hours are displayed in a 12h format, use false for 24h format. (Default: true)
  const twelveHours = true;
  // roundedGraph : true|false > true (Use rounded values to draw the graph) | false (Draws the graph using decimal values, this can be used to draw an smoother line).
  const roundedGraph = true;
  // roundedTemp : true|false > true (Displays the temps rounding the values (29.8 = 30 | 29.3 = 29).
  const roundedTemp = true;
  // hoursToShow : number > Number of predicted hours to show, Eg: 3 = a total of 4 hours in the widget (Default: 3 for the small widget and 11 for the medium one).
  const hoursToShow = configWL[widgetSize].hoursToShow;

  const contextSize = getWidgetSizeInPoints(); //'medium', new Size(414, 896));

  const weatherData = await getWeatherData(widgetParams.BOM_GEOHASH);

  // Default widget padding is 16 points
  const widgetPadding = 16;

  const widget = new ListWidget();
  widget.setPadding(widgetPadding, widgetPadding, 0, widgetPadding);
  widget.backgroundGradient = colorscheme.bgGradient;

  const rowStack = widget.addStack();
  rowStack.layoutVertically();
  rowStack.topAlignContent();
  rowStack.setPadding (0,0,0,0);
  addHourlyStack(rowStack);
  rowStack.addSpacer();

  widget.presentMedium();


  // Functions
  function drawChartImage(weatherData, w, h) {
    const ctx = new DrawContext();
    ctx.size = new Size(w, h);
    ctx.opaque = false;
    ctx.setTextAlignedCenter();
    ctx.respectScreenScale = true;

    const tempFontSize = configWL.tempFontSize;
    const lineStrokeWidth = 3;
    const symbolFontSize = configWL.symbolFontSize;
    const axisFontSize = configWL.headerFontSize;
    const axisFontColor = colorscheme.fgColor;
    const axisFontWeight = 'regular';
    const axisOffset = ctx.size.height - axisFontSize * 1.5;

    let min, max, diff;
    for (let i = 0; i <= hoursToShow; i++) {
      let temp = shouldRound(roundedGraph, weatherData.hourly[i].temp);
      min = temp < min || min == undefined ? temp : min;
      max = temp > max || max == undefined ? temp : max;
    }
    diff = max - min;

    const unitWidth = ctx.size.width / hoursToShow;
    const lowerLineLimit = ctx.size.height - 2 * axisFontSize - symbolFontSize;
    const upperLineLimit = 0; //+ tempFontSize / 2;
    const verticalSpacing = (lowerLineLimit - upperLineLimit) / diff;

    for (let i = 0; i <= hoursToShow; i++) {
      const hourData = weatherData.hourly[i];
      const nextHourTemp = shouldRound(
        roundedGraph,
        weatherData.hourly[i + 1].temp
      );
      let hour = parseDate(hourData.time).getHours();
      if (twelveHours)
        hour =
          hour > 12 ? hour - 12 : hour == 0 ? "12a" : hour == 12 ? "12p" : hour;
      const temp = i == 0 ? weatherData.current.temp : hourData.temp;

      // Vertically center line when diff == 0 (all temperatures are the same)
      let delta = diff > 0 ? (shouldRound(roundedGraph, temp) - min) / diff : 0.5;
      let nextDelta = diff > 0 ? (nextHourTemp - min) / diff : 0.5;

      const x1 = unitWidth * i + unitWidth / 2;
      const y1 = lowerLineLimit - verticalSpacing * delta;
      const x2 = unitWidth * (i + 1) + unitWidth / 2;
      const y2 = lowerLineLimit - verticalSpacing * nextDelta;

      // Do not draw line from last element to element after
      if (i < hoursToShow - 1) {
        drawLine(
          ctx,
          x1, y1, x2, y2, lineStrokeWidth, dynamicColor(hourData));
      }

      // Symbol
      const symbol = symbolForCondition(hourData, symbolFontSize);
      // fillEllipse(
      //   ctx,
      //   x1 - symbolFontSize,
      //   y1 - symbolFontSize,
      //   symbolFontSize * 1.5,
      //   symbolFontSize * 1.5,
      //   colorscheme.bgColor
      // );
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
        shouldRound(roundedTemp, temp),
        labelFontSize,
        // x
        unitWidth * i,
        // y
        y1 - symbol.size.height - labelFontSize,
        // width
        unitWidth,
        // height
        labelFontSize,
        dynamicColor(hourData),
        'regular'
      );

      // Axis text
      drawTextC(
        ctx,
        i == 0 ? nowstring : hour,
        axisFontSize,
        // x
        unitWidth * i,
        // y
        axisOffset,
        // width
        unitWidth,
        // height
        axisFontSize * 1.5,
        axisFontColor,
        axisFontWeight,
      );
    }

    return ctx.getImage()
  }

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
  function symbolForCondition(hourData, size) {
    let sfs = SFSymbol.named("wind");
    if (typeof SYMBOL_MAP[hourData.icon_descriptor] == "object") {
      sfs = SFSymbol.named((hourData.is_night && SYMBOL_MAP[hourData.icon_descriptor].night) || SYMBOL_MAP[hourData.icon_descriptor].day);
    }

    sfs.applyFont(Font.systemFont(size));
    return sfs.image;
  }

  function dynamicColor(hourData) {
    // Night
    if (hourData.is_night == true) return colorscheme.nightColor;

    // Rain or Snow
    if (hourData.rain.chance >= 20) return colorscheme.rainColor;

    // Extreme Heat
    if (hourData.temp >= 35) return colorscheme.heatColor;

    return colorscheme.dayColor;
  }

  // Hourly stack contains temp chart
  function addHourlyStack(parentStack) {
    const hourlyStack = parentStack.addStack()
    hourlyStack.setPadding(0,0,0,0);
    hourlyStack.layoutVertically();
    hourlyStack.topAlignContent();

    const headerStack = hourlyStack.addStack()
    headerStack.setPadding(0,0,0,0);
    headerStack.layoutHorizontally();
    headerStack.topAlignContent();
    drawDebugBorder(headerStack);

    const textStack = headerStack.addStack()
    textStack.setPadding(0,0,0,0);
    textStack.layoutVertically();
    textStack.topAlignContent();

    const heading = textStack.addText(widgetParams.locationName);
    heading.textColor = colorscheme.fgColor;
    heading.font = Font.semiboldSystemFont(configWL.headerFontSize);
    heading.minimumScaleFactor = 1;

    const subheading = textStack.addText(weatherData.daily[0].short_text);
    subheading.textColor = colorscheme.fgColor;
    subheading.font = Font.regularSystemFont(configWL.headerFontSize);
    subheading.minimumScaleFactor = 1;

    headerStack.addSpacer();

    const chartStack = hourlyStack.addStack();
    chartStack.setPadding(0,0,0,0);
    chartStack.layoutHorizontally();

    const chartWidth = contextSize.width - widgetPadding * 2;
    const chartHeight = contextSize.height - widgetPadding * 2 - configWL.headerFontSize * 2;
    const chartImage = drawChartImage(weatherData, chartWidth, chartHeight);
    const img = chartStack.addImage(chartImage);
    drawDebugBorder(img);
  }

  Script.complete();
}

/**
* Draws debug borders around elements to help refine the layout
*
* @param {object} e
* @returns {object}
*/
function drawDebugBorder(ctx, rect) {
  if (ENABLE_DEBUG_BORDERS != true) return;

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

function fillEllipse(ctx, x, y, w, h, fillColor) {
  ctx.setFillColor(fillColor);
  ctx.fillEllipse(new Rect(x, y, w, h));
}

function getWidgetSizeInPoints(
  widgetSize = (config.runsInWidget ? config.widgetFamily : widgetParams.widgetSize),
  screenSize = (widgetParams.screenSize || Device.screenSize())
) {
  // RegExp to verify widgetSize
  const sizes = /^(?:small|medium|large)$/

  // stringify device screen size
  const devSize = (({width: w, height: h}) => w > h ? `${h}x${w}` : `${w}x${h}`)(screenSize)

  // screen size to widget size mapping for iPhone, excluding the latest iPhone 12 series. iPad size
  const sizeMap = {
    // iPad Mini 2/3/4, iPad 3/4, iPad Air 1/2. 9.7" iPad Pro
    // '768x1024': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // 10.2" iPad
    // '810x1080': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // 10.5" iPad Pro, 10.5" iPad Air 3rd Gen
    // '834x1112': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // 10.9" iPad Air 4th Gen
    // '820x1180': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // 11" iPad Pro
    '834x1194': { small: [155, 155], medium: [329, 155], large: [345, 329] },
    // 12.9" iPad Pro
    '1024x1366': { small: [170, 170], medium: [332, 170], large: [382, 332] },
    // 12 Pro Max
    // '428x926': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // XR, 11, 11 Pro Max
    '414x896': { small: [169, 169], medium: [360, 169], large: [360, 376] },
    // 12, 12 Pro
    // '390x844': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // X, XS, 11 Pro, 12 Mini
    '375x812': { small: [155, 155], medium: [329, 155], large: [329, 345] },
    // 6/7/8(S) Plus
    '414x736': { small: [159, 159], medium: [348, 159], large: [348, 357] },
    // 6/7/8(S) and 2nd Gen SE
    '375x667': { small: [148, 148], medium: [322, 148], large: [322, 324] },
    // 1st Gen SE
    '320x568': { small: [141, 141], medium: [291, 141], large: [291, 299] }
  }
  let widgetSizeInPoint = null

  if (widgetSize && sizes.test(widgetSize)) {
    let mappedSize = sizeMap[devSize]
    if (mappedSize) {
      widgetSizeInPoint = new Size(...mappedSize[widgetSize])
    }
  }
  console.log(widgetSizeInPoint)
  return widgetSizeInPoint
}

// Fetching should normalize to a simplified format
async function fetchWeatherData(geohash) {
  // Undocumented BOM API
  // Example: https://weather.bom.gov.au/location/r1r14cw-carlton-north
  console.log(`Fetching BOM forecasts for ${geohash}...`);
  const [
    observationData,
    hourlyData,
    dailyData,
  ] = await Promise.all([
    new Request(`https://api.weather.bom.gov.au/v1/locations/${geohash}/observations`).loadJSON(),
    new Request(`https://api.weather.bom.gov.au/v1/locations/${geohash}/forecasts/hourly`).loadJSON(),
    new Request(`https://api.weather.bom.gov.au/v1/locations/${geohash}/forecasts/daily`).loadJSON(),
  ]);

  const weatherData = {
    current: observationData.data,
    hourly: hourlyData.data,
    daily: dailyData.data,
  };
  return weatherData;
}

module.exports = {
  main,
};

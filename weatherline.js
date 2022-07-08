// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: magic;
async function main() {
  // Widget Params
  // Don't edit this, those are default values for debugging (location for Cupertino).
  // You need to give your locations parameters through the widget params, more info below.
  const debugParams = JSON.stringify({
    LOC_ID: "r1r14c",
    LOC_NAME: "Carlton North",
  });
  const widgetParams = JSON.parse(
    args.widgetParameter != null ? args.widgetParameter : debugParams
  );

  const ENABLE_DEBUG_BORDERS = false;

  // BOM Location data
  var LOCATION_ID = "r1r14c"; // widgetParams.LOC_ID; // "abc123"
  var LOCATION_NAME = "Carlton North"; // widgetParams.LOC_NAME; // "Your place"

  // String customization
  const nowstring = "Now"; // Your local term for "now"
  const feelsstring = ""; //Your local term for "feels like"
  const relHumidity = ""; // any local term for "humidity"
  const pressure = "";
  const windspeed = "";

  // twelveHours : true|false > Defines if the hours are displayed in a 12h format, use false for 24h format. (Default: true)
  const twelveHours = true;
  // roundedGraph : true|false > true (Use rounded values to draw the graph) | false (Draws the graph using decimal values, this can be used to draw an smoother line).
  const roundedGraph = true;
  // roundedTemp : true|false > true (Displays the temps rounding the values (29.8 = 30 | 29.3 = 29).
  const roundedTemp = true;
  // hoursToShow : number > Number of predicted hours to show, Eg: 3 = a total of 4 hours in the widget (Default: 3 for the small widget and 11 for the medium one).
  const hoursToShow = config.widgetFamily == "small" ? 3 : 10;


  const contextSize = getWidgetSizeInPoints('medium', new Size(414, 896));
  const contextWidth = contextSize.width;
  const contextHeight = contextSize.height;

  // accentColor : Color > Accent color of some elements (Graph lines and the location label).
  const accentColor = new Color("#FE9C00", 1);
  // foregroundColor : Color > Foreground color of the widget (Text and labels)
  const foregroundColor = new Color("#949494", 1);
  // backgroundColor : Color > Background color of the widgets.
  const backgroundColor = new Color("#262626", 1);

  /** From here proceed with caution. **/

  // Set up cache. File located in the Scriptable iCloud folder
  let fm = FileManager.iCloud();
  let cachePath = fm.joinPath(fm.documentsDirectory(), "weatherCache"); // <- file name
  if (!fm.fileExists(cachePath)) {
    fm.createDirectory(cachePath);
  }

  let weatherData;
  let usingCachedData = false;
  let drawContext = new DrawContext();

  const widgetPadding = 20;
  const headerFontSize = 12;

  const chartWidth = contextSize.width - widgetPadding * 2;
  const chartHeight = contextSize.height - widgetPadding * 2 - headerFontSize * 2;
  drawContext.size = new Size(chartWidth, chartHeight); // contextSize.width - 20, 100);
  drawContext.opaque = false;
  drawContext.setTextAlignedCenter();
  drawContext.respectScreenScale = true;

  cacheKey = "lastread" + "_" + LOCATION_ID + ".json";
  try {
    weatherData = await fetchWeatherData();
    fm.writeString(
      fm.joinPath(cachePath, cacheKey),
      JSON.stringify(weatherData)
    );
  } catch (e) {
    console.log("Offline mode");
    try {
      await fm.downloadFileFromiCloud(fm.joinPath(cachePath, cacheKey));
      let raw = fm.readString(fm.joinPath(cachePath, cacheKey));
      weatherData = JSON.parse(raw);
      usingCachedData = true;
    } catch (e2) {
      console.log("Error: No offline data cached");
    }
  }


  const widget = new ListWidget();
  //widget.useDefaultPadding();
  widget.setPadding(20, 20, 0, 20);
  widget.backgroundColor = backgroundColor;

  const rowStack = widget.addStack();
  rowStack.layoutVertically();
  rowStack.topAlignContent();
  rowStack.setPadding (0,0,0,0);

  addHourlyStack(rowStack);

  rowStack.addSpacer();

  /**
  * Draws debug borders around elements to help refine the layout
  *
  * @param {object} e
  * @returns {object}
  */
  function drawDebugBorder(e, drawContext) {
    if (ENABLE_DEBUG_BORDERS != true) return;
    const DEBUG_BORDER_COLOR = Color.red();

    if ((e instanceof WidgetStack) || (e instanceof WidgetImage)) {
      e.borderWidth = 1;
      e.borderColor = DEBUG_BORDER_COLOR;
      return;
    }

    if ((e instanceof Rect) && (drawContext != undefined)) {
      drawContext.setLineWidth(1);
      drawContext.setStrokeColor(DEBUG_BORDER_COLOR);
      drawContext.strokeRect(e);
    }
  }

  function drawBadChart() {
    let min, max, diff;
    for (let i = 0; i <= hoursToShow; i++) {
      let temp = shouldRound(roundedGraph, weatherData.hourly[i].temp);
      min = temp < min || min == undefined ? temp : min;
      max = temp > max || max == undefined ? temp : max;
    }
    diff = max - min;

    for (let i = 0; i <= hoursToShow; i++) {
      let hourData = weatherData.hourly[i];
      let nextHourTemp = shouldRound(
        roundedGraph,
        weatherData.hourly[i + 1].temp
      );
      let hour = parseDate(hourData.time).getHours();
      if (twelveHours)
        hour =
          hour > 12 ? hour - 12 : hour == 0 ? "12a" : hour == 12 ? "12p" : hour;
      let temp = i == 0 ? weatherData.current.temp : hourData.temp;
      let delta = diff > 0 ? (shouldRound(roundedGraph, temp) - min) / diff : 0.5;
      let nextDelta = diff > 0 ? (nextHourTemp - min) / diff : 0.5;


      // Vertical offsets
      const baseOffset = 0;
      const lineOffset = baseOffset + 75;
      const tempOffset = baseOffset + 55;
      const symbolOffset = baseOffset + 61;
      const verticalSpacing = 20;

      // Horizontal spacing
      const baseWidth = 0; // Approx width of a temp symbol
      const horizonalSpacing = Math.trunc((drawContext.size.width) / (hoursToShow + 1))
      const horizontalOffset = 0; // (drawContext.size.width - horizonalSpacing * (hoursToShow + 1)) / 2

      const unitWidth = drawContext.size.width / hoursToShow;

      const lineStrokeWidth = 3;
      const x1 = unitWidth * i + unitWidth / 2;
      const y1 = lineOffset - verticalSpacing * delta;
      const x2 = unitWidth * (i + 1) + unitWidth / 2;
      const y2 = lineOffset - verticalSpacing * nextDelta;
      if (i < hoursToShow - 1) {
        // 'Night' boolean for line graph and SFSymbols
        var night = hourData.is_night;
        drawLine(x1, y1, x2, y2, lineStrokeWidth, dynamicColor(hourData));
      }

      // Symbol
      const condition = hourData.icon_descriptor;
      const symbol = symbolForCondition(condition, night);
      drawImage(
        symbol,
        x1 - symbol.size.width / 2,
        y1 - symbol.size.height / 2,
      );

      // Temperature text
      const tempFontSize = 16 * (i > 0 ? 1 : 1.5);
      drawTextC(
        shouldRound(roundedTemp, temp),
        tempFontSize,
        // x
        unitWidth * i,
        // y
        y1 - symbol.size.height - tempFontSize,
        // width
        unitWidth,
        // height
        tempFontSize,
        dynamicColor(hourData),
        'regular'
      );


      // Axis text
      const axisFontSize = 12;
      const axisFontColor = Color.gray();
      const axisFontWeight = 'regular';
      const axisOffset = drawContext.size.height - axisFontSize * 1.5;
      drawTextC(
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

      previousDelta = delta;
    }

    return drawContext.getImage()
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

  //widget.backgroundImage = drawContext.getImage();
  widget.presentMedium();

  function parseDate(dt) {
    return new Date(dt);
  }

  function drawText(
    text,
    fontSize,
    x,
    y,
    color = Color.black(),
    fontWeight = "bold"
  ) {
    drawContext.setFont(Font[fontWeight + "SystemFont"](fontSize));
    drawContext.setTextColor(color);
    drawContext.drawText(new String(text).toString(), new Point(x, y));
  }

  function drawImage(image, x, y) {
    drawContext.drawImageAtPoint(image, new Point(x, y));
  }

  function drawTextC(
    text,
    fontSize,
    x,
    y,
    w,
    h,
    color = Color.black(),
    fontWeight = "bold"
  ) {
    drawContext.setFont(Font[fontWeight + "SystemFont"](fontSize));
    drawContext.setTextColor(color);
    const rect = new Rect(x, y, w, h);
    drawContext.drawTextInRect(
      new String(text).toString(),
      rect
    );

    drawDebugBorder(rect, drawContext);
  }

  function drawLine(x1, y1, x2, y2, width, color) {
    const path = new Path();
    path.move(new Point(x1, y1));
    path.addLine(new Point(x2, y2));
    drawContext.addPath(path);
    drawContext.setStrokeColor(color);
    drawContext.setLineWidth(width);
    drawContext.strokePath();
  }

  function shouldRound(should, value) {
    return should ? Math.round(value) : value;
  }

  function isSameDay(date1, date2) {
    return (
      date1.getYear() == date2.getYear() &&
      date1.getMonth() == date2.getMonth() &&
      date1.getDate() == date2.getDate()
    );
  }

  // SFSymbol function
  function symbolForCondition(condition, night) {
    let mapSymbols = {
      clear: function () {
        return night ? "moon.stars.fill" : "sun.max.fill";
      },
      cloudy: function () {
        return night ? "cloud.fill" : "cloud.fill";
      },
      cyclone: function () {
        return "tropicalstorm";
      },
      dust: function () {
        "sun.dust.fill";
      },
      dusty: function () {
        "sun.dust.fill";
      },
      fog: function () {
        return "cloud.fog.fill";
      },
      frost: function () {
        return "sparkles";
      },
      haze: function () {
        return night ? "moon.haze.fill" : "sun.haze.fill";
      },
      hazy: function () {
        return night ? "moon.haze.fill" : "sun.haze.fill";
      },
      heavy_shower: function () {
        return "cloud.heavyrain.fill";
      },
      heavy_showers: function () {
        return "cloud.heavyrain.fill";
      },
      light_rain: function () {
        return "cloud.drizzle.fill";
      },
      light_shower: function () {
        return "cloud.drizzle.fill";
      },
      light_showers: function () {
        return "cloud.drizzle.fill";
      },
      mostly_sunny: function () {
        return night ? "cloud.moon.fill" : "cloud.sun.fill";
      },
      partly_cloudy: function () {
        return night ? "cloud.moon.fill" : "cloud.sun.fill";
      },
      rain: function () {
        return "cloud.heavyrain.fill";
      },
      shower: function () {
        return "cloud.rain.fill";
      },
      showers: function () {
        return "cloud.rain.fill";
      },
      snow: function () {
        return "snow";
      },
      storm: function () {
        return "cloud.bolt.rain.fill";
      },
      storms: function () {
        return "cloud.bolt.rain.fill";
      },
      sunny: function () {
        return "sun.max.fill";
      },
      tropical_cyclone: function () {
        return "hurricane";
      },
      wind: function () {
        return "wind";
      },
      windy: function () {
        return "wind";
      },
    };

    let sfs = SFSymbol.named("cloud.drizzle.fill");
    if (typeof mapSymbols[condition] == "function") {
      sfs = SFSymbol.named(mapSymbols[condition]());
    }

    sfs.applyFont(Font.systemFont(18));
    return sfs.image;
  }

  function dynamicColor(hourData) {
    // Night
    if (hourData.is_night == true) {
      // Gray
      return new Color("#999999");
    }
    // Rain or Snow
    if (hourData.rain.chance >= 20) {
      // Blue
      // Light: #259EDC
      // Dark: #2893DE
      return new Color("#2893DE", 1);
    }

    // Extreme Heat
    if (hourData.temp >= 35) {
      // Red
      // Light:
      // Dark: F45246
      return new Color("#F45246", 1);
    }

    return new Color("#FE9C00", 1);
    return foregroundColor;
  }

  // Fetching should normalize to a simplified format
  async function fetchWeatherData() {
    // Undocumented BOM API
    // Example: https://weather.bom.gov.au/location/r1r14cw-carlton-north
    const geohash = "r1r14c";
    console.log(`Fetching BOM forecasts for ${geohash}...`);
    const observationData = await new Request(
      `https://api.weather.bom.gov.au/v1/locations/${geohash}/observations`
    ).loadJSON();
    const hourlyData = await new Request(
      `https://api.weather.bom.gov.au/v1/locations/${geohash}/forecasts/hourly`
    ).loadJSON();
    const dailyData = await new Request(
      `https://api.weather.bom.gov.au/v1/locations/${geohash}/forecasts/daily`
    ).loadJSON();
    const weatherData = {
      current: {
        ...observationData.data,
        time: observationData.metadata.observation_time,
      },
      hourly: hourlyData.data,
      daily: dailyData.data,
    };
    return weatherData;
  }


  function getWidgetSizeInPoints(widgetSize = (config.runsInWidget ? config.widgetFamily : 'medium'), screenSize = Device.screenSize()) {
    // console.log(widgetSize)
    // console.log(screenSize)
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
    return widgetSizeInPoint
  }

  // Hourly stack contains temp chart
  function addHourlyStack(parentStack, halfSize = false) {
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

    const heading = textStack.addText(LOCATION_NAME)
    heading.textColor = foregroundColor;
    heading.font = Font.semiboldSystemFont(12);
    heading.minimumScaleFactor = 1;

    const subheading = textStack.addText('Partly cloudy')
    subheading.textColor = foregroundColor;
    subheading.font = Font.regularSystemFont(12);
    subheading.minimumScaleFactor = 1;

    headerStack.addSpacer();

    const chartStack = hourlyStack.addStack();
    chartStack.setPadding(0,0,0,0);
    chartStack.layoutHorizontally();

    const chartImage = drawBadChart();
    const img = chartStack.addImage(chartImage);
    drawDebugBorder(img);
  }

  Script.complete();
}

module.exports = {
  main,
};

async function main() {
	// Widget Params
	// Don't edit this, those are default values for debugging (location for Cupertino).
	// You need to give your locations parameters through the widget params, more info below.
	const debugParams = JSON.stringify({
		"LOC_ID": "r1r14c",
		"LOC_NAME": "Carlton North",
	//	 "LAT": "45.5736",
	//	"LON": "12.1061"
	})
	const widgetParams = JSON.parse((args.widgetParameter != null) ? args.widgetParameter : debugParams)

	// Dimension
	// Widget size 
	// If size_large = true the widget will be big otherwise small
	const size_large = true;

	// WEATHER API PARAMETERS !important
	// API KEY, you need an Open Weather API Key
	// You can get one for free at: https://home.openweathermap.org/api_keys (account needed).
	// const API_KEY = "your_key_here"

	// Latitude and Longitude of the location where you get the weather of.
	// You can get those from the Open Weather website while searching for a city, etc.
	// This values are getted from the widget parameters, the widget parameters is a JSON string that looks like this:
	// { "LAT" : "<latitude>" , "LON" : "<longitude>" , "LOC_NAME" : "<name to display>" }
	// This to allow multiple instances of the widget with different locations, if you will only use one instance (1 widget), you can "hardcode" the values here.
	// Note: To debug the widget you need to place the values here, because when playing the script in-app the widget parameters are null (= crash).

	// Hardcoded Location, type in your latitude/longitude values and location name
	// var LAT = widgetParams.LAT // 12.34 
	// var LON = widgetParams.LON // 12.34 
	var LOCATION_ID = widgetParams.LOC_ID // "abc123"
	var LOCATION_NAME = widgetParams.LOC_NAME // "Your place"

	// Looking settings
	// This are settings to customize the looking of the widgets, because this was made an iPhone SE (2016) screen, I can't test for bigger screens.
	// So feel free to modify this to your taste.

	// Support locales
	const locale = "en" // "fr" "it" "de" etc. for weather description language
	const nowstring = "now" // Your local term for "now"
	const feelsstring = "" //Your local term for "feels like"
	const relHumidity = "" // any local term for "humidity"
	const pressure = ""
	const windspeed = ""

	// units : string > Defines the unit used to measure the temps, for temperatures in Fahrenheit use "imperial", "metric" for Celcius and "standard" for Kelvin (Default: "metric").
	const units = "metric"
	// twelveHours : true|false > Defines if the hours are displayed in a 12h format, use false for 24h format. (Default: true)
	const twelveHours = false
	// roundedGraph : true|false > true (Use rounded values to draw the graph) | false (Draws the graph using decimal values, this can be used to draw an smoother line).
	const roundedGraph = true
	// roundedTemp : true|false > true (Displays the temps rounding the values (29.8 = 30 | 29.3 = 29).
	const roundedTemp = true
	// hoursToShow : number > Number of predicted hours to show, Eg: 3 = a total of 4 hours in the widget (Default: 3 for the small widget and 11 for the medium one).
	const hoursToShow = (config.widgetFamily == "small") ? 3 : 11;
	// spaceBetweenDays : number > Size of the space between the temps in the graph in pixels. (Default: 60 for the small widget and 44 for the medium one).
	const spaceBetweenDays = (config.widgetFamily == "small") ? 60 : 44;

	// Widget Size !important.
	// Since the widget works "making" an image and displaying it as the widget background, you need to specify the exact size of the widget to
	// get an 1:1 display ratio, if you specify an smaller size than the widget itself it will be displayed blurry.
	// You can get the size simply taking an screenshot of your widgets on the home screen and measuring them in an image-proccessing software.
	// contextSize : number > Height of the widget in screen pixels, this depends on you screen size (for an 4 inch display the small widget is 282 * 282 pixels on the home screen)
	const contextSize = 282
	// mediumWidgetWidth : number > Width of the medium widget in pixels, this depends on you screen size (for an 4 inch display the medium widget is 584 pixels long on the home screen)
	const mediumWidgetWidth = 584

	// accentColor : Color > Accent color of some elements (Graph lines and the location label).
	const accentColor = new Color("#EB6E4E", 1)
	// backgroundColor : Color > Background color of the widgets.
	const backgroundColor = new Color("#1C1C1E", 1)

	// Position and size of the elements on the widget.
	// All coordinates make reference to the top-left of the element.
	// locationNameCoords : Point > Define the position in pixels of the location label.
	const locationNameCoords = new Point(30, 26)
	// locationNameFontSize : number > Size in pixels of the font of the location label.
	const locationNameFontSize = 26
	// weatherDescriptionCoords : Point > Position of the weather description label in pixels.
	const weatherDescriptionCoords = new Point(30, 52)
	// weatherDescriptionFontSize : number > Font size of the weather description label.
	const weatherDescriptionFontSize = 18
	//footerFontSize : number > Font size of the footer labels (feels like... and last update time).
	const footerFontSize = 18
	//feelsLikeCoords : Point > Coordinates of the "feels like" label.
	const feelsLikeCoords = new Point(28, 230)
	//lastUpdateTimePosAndSize : Rect > Defines the coordinates and size of the last updated time label.
	const lastUpdateTimePosAndSize = new Rect((config.widgetFamily == "small") ? 150 : 450, 230, 100, footerFontSize+1)

	/** From here proceed with caution. **/

	// Set up cache. File located in the Scriptable iCloud folder
	let fm = FileManager.iCloud();
	let cachePath = fm.joinPath(fm.documentsDirectory(), "weatherCache"); // <- file name
	if(!fm.fileExists(cachePath)){
		fm.createDirectory(cachePath)
	}

	let weatherData;
	let usingCachedData = false;
	let drawContext = new DrawContext();

	drawContext.size = new Size((config.widgetFamily == "small") ? contextSize : mediumWidgetWidth, contextSize)
	drawContext.opaque = false
	drawContext.setTextAlignedCenter()

	cacheKey = "lastread" + "_" + LOCATION_ID
	try {
		weatherData = await fetchWeatherData()
		fm.writeString(fm.joinPath(cachePath, cacheKey), JSON.stringify(weatherData));
	}catch(e){
		console.log("Offline mode")
		try{
			await fm.downloadFileFromiCloud(fm.joinPath(cachePath, cacheKey));
			let raw = fm.readString(fm.joinPath(cachePath, cacheKey));
			weatherData = JSON.parse(raw);
			usingCachedData = true;
		}catch(e2){
			console.log("Error: No offline data cached")
		}
	}

	let widget = new ListWidget();
	widget.setPadding(0, 0, 0, 0);
	widget.backgroundColor = backgroundColor;

	drawText(LOCATION_NAME, locationNameFontSize, locationNameCoords.x, locationNameCoords.y, accentColor);
	// FIXME: description
	drawText("Always sunny!", weatherDescriptionFontSize, weatherDescriptionCoords.x, weatherDescriptionCoords.y, Color.white())

	let min, max, diff;
	for(let i = 0; i<=hoursToShow ;i++){
		let temp = shouldRound(roundedGraph, weatherData.hourly[i].temp);
		min = (temp < min || min == undefined ? temp : min)
		max = (temp > max || max == undefined ? temp : max)
	}
	diff = max -min;

	for(let i = 0; i<=hoursToShow ;i++){
		let hourData = weatherData.hourly[i];
		let nextHourTemp = shouldRound(roundedGraph, weatherData.hourly[i+1].temp);
		let hour = parseDate(hourData.time).getHours();
		if(twelveHours)
			hour = (hour > 12 ? hour - 12 : (hour == 0 ? "12a" : ((hour == 12) ? "12p" : hour)))
		let temp = i==0?weatherData.current.temp : hourData.temp
		let delta = (diff>0)?(shouldRound(roundedGraph, temp) - min) / diff:0.5;
		let nextDelta = (diff>0)?(nextHourTemp - min) / diff:0.5
		
		if(i < hoursToShow){
			// 'Night' boolean for line graph and SFSymbols
			var night = hourData.is_night
			drawLine(spaceBetweenDays * (i) + 50, 175 - (50 * delta),spaceBetweenDays * (i+1) + 50 , 175 - (50 * nextDelta), 4, (night ? Color.gray() : accentColor))
		}
		
		drawTextC(shouldRound(roundedTemp, temp)+"°", 20, spaceBetweenDays*i+30, 135 - (50*delta), 50, 21, Color.white())
			
		// Next 2 lines SFSymbols tweak
		const condition = i==0?weatherData.daily[0].icon_descriptor.id:hourData.icon_descriptor
		drawImage(symbolForCondition(condition), spaceBetweenDays * i + 34, 161 - (50*delta)); //40, 165
		
		drawTextC((i==0?nowstring:hour), 18, spaceBetweenDays*i+25, 200,50, 21, Color.gray())
		
		previousDelta = delta;
	}

	if(size_large){
		drawText(feelsstring + " " + Math.round(weatherData.current.temp_feels_like) + "° | " + relHumidity + " " + weatherData.current.humidity + "% | " + pressure + " " + weatherData.current.pressure + "hPa | " + windspeed + " " + weatherData.current.wind.speed_kilometre + "km/h", footerFontSize, feelsLikeCoords.x, feelsLikeCoords.y, Color.gray())
	} else {
		drawText(feelsstring + " " + Math.round(weatherData.current.temp_feels_like) + "° | " + relHumidity + " " + weatherData.current.humidity + "%", footerFontSize, feelsLikeCoords.x, feelsLikeCoords.y, Color.gray())
	}

	drawContext.setTextAlignedRight();
	drawTextC(parseDate(weatherData.current.time).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'} ), footerFontSize, lastUpdateTimePosAndSize.x, lastUpdateTimePosAndSize.y, lastUpdateTimePosAndSize.width, lastUpdateTimePosAndSize.height, Color.gray())

	if(usingCachedData)
		drawText("⚠️", 32, ((config.widgetFamily == "small") ? contextSize : mediumWidgetWidth)-72,30)

	widget.backgroundImage = (drawContext.getImage())
	widget.presentMedium()

	function parseDate(dt){
		return new Date(dt)
	}

	function drawText(text, fontSize, x, y, color = Color.black()){
		drawContext.setFont(Font.boldSystemFont(fontSize))
		drawContext.setTextColor(color)
		drawContext.drawText(new String(text).toString(), new Point(x, y))
	}

	function drawImage(image, x, y){
		drawContext.drawImageAtPoint(image, new Point(x, y))
	}

	function drawTextC(text, fontSize, x, y, w, h, color = Color.black()){
		drawContext.setFont(Font.boldSystemFont(fontSize))
		drawContext.setTextColor(color)
		drawContext.drawTextInRect(new String(text).toString(), new Rect(x, y, w, h))
	}

	function drawLine(x1, y1, x2, y2, width, color){
		const path = new Path()
		path.move(new Point(x1, y1))
		path.addLine(new Point(x2, y2))
		drawContext.addPath(path)
		drawContext.setStrokeColor(color)
		drawContext.setLineWidth(width)
		drawContext.strokePath()
	}

	function shouldRound(should, value){
		return ((should) ? Math.round(value) : value)
	}

	function isSameDay(date1, date2){
		return (date1.getYear() == date2.getYear() && date1.getMonth() == date2.getMonth() &&	 date1.getDate() == date2.getDate())
	}

	// SFSymbol function
	function symbolForCondition(cond){
		let mapSymbols = {
			"clear": function(){
				return night ? "moon.stars.fill" : "sun.max.fill"
			},
			"cloudy": function(){
				return night ? "cloud.moon.fill" : "cloud.sun.fill"
			},
			"cyclone": function(){ return "tropicalstorm" },
			"dust": "mdi:weather-hazy",
			"dusty": "mdi:weather-hazy",
			"fog": "mdi:weather-fog",
			"frost": "mdi:snowflake-melt",
			"haze": "mdi:weather-hazy",
			"hazy": function(){
				return night ? "moon.haze.fill" : "sun.haze.fill"
			},
			"heavy_shower": function(){ return "cloud.heavyrain.fill" },
			"heavy_showers": function(){ return "cloud.heavyrain.fill" },
			"light_rain": function(){ return "cloud.drizzle.fill" },
			"light_shower": function(){ return "cloud.drizzle.fill" },
			"light_showers": function(){ return "cloud.drizzle.fill" },
			"mostly_sunny": "mdi:weather-sunny",
			"partly_cloudy": "mdi:weather-partly-cloudy",
			"rain": function(){ return "cloud.heavyrain.fill" },
			"shower": function(){ return "cloud.rain.fill" },
			"showers": function(){ return "cloud.rain.fill" },
			"snow": function(){ return "snow" },
			"storm": function(){ return "cloud.bolt.rain.fill" },
			"storms": function(){ return "cloud.bolt.rain.fill" },
			"sunny": function(){ return "sun.max.fill" },
			"tropical_cyclone": function(){ return "hurricane" },
			"wind": function(){ return "wind" },
			"windy": function(){ return "wind" },
		}
		let symbols = {
		// Thunderstorm
			"2": function(){
				return "cloud.bolt.rain.fill"
			},
		// Drizzle
			"3": function(){
				return "cloud.drizzle.fill"
			},
		// Rain
			"5": function(){
				return (cond == 511) ? "cloud.sleet.fill" : "cloud.rain.fill"
			},
		// Snow
			"6": function(){
				return (cond >= 611 && cond <= 613) ? "cloud.snow.fill" : "snow"
			},
		// Atmosphere
			"7": function(){
				if (cond == 781) { return "tornado" }
				if (cond == 701 || cond == 741) { return "cloud.fog.fill" }
				return night ? "cloud.fog.fill" : "sun.haze.fill"
			},
		// Clear and clouds
			"8": function(){
				if (cond == 800) { return night ? "moon.stars.fill" : "sun.max.fill" }
				if (cond == 802 || cond == 803) { return night ? "cloud.moon.fill" : "cloud.sun.fill" }
				return "cloud.fill"
			}
		}
		// Get first condition digit.
		// let conditionDigit = Math.floor(cond / 100)
		// Style and return the symbol.
		//let sfs = SFSymbol.named(symbols[conditionDigit]())
		let sfs = SFSymbol.named("cloud.drizzle.fill")
		sfs.applyFont(Font.systemFont(25))
		return sfs.image
	}

	// TODO encapsulate API in data function
	// Fetching should normalize to a simplified format
	async function fetchWeatherData() {
		// Undocumented BOM API
		// Example: https://weather.bom.gov.au/location/r1r14cw-carlton-north
		observationData = await new Request("https://api.weather.bom.gov.au/v1/locations/" + LOCATION_ID + "/observations").loadJSON()
		hourlyData = await new Request("https://api.weather.bom.gov.au/v1/locations/" + LOCATION_ID + "/forecasts/hourly").loadJSON()
		dailyData = await new Request("https://api.weather.bom.gov.au/v1/locations/" + LOCATION_ID + "/forecasts/daily").loadJSON()
		weatherData = {
			"current": {
				...observationData.data,
				"time": observationData.metadata.observation_time
			},
			"hourly": hourlyData.data,
			"daily": dailyData.data
		}

		return weatherData
	}

	Script.complete()
}

module.exports = {
  main
};

////////////////////////////////////////////////////////////////////////////////
//
//  THIS CODE IS NOT APPROVED FOR USE IN/ON ANY OTHER UI ELEMENT OR PRODUCT COMPONENT.
//  Copyright (c) 2006 Microsoft Corporation.  All rights reserved.
//  Modify by Domain / Dorice, dyhan81
//
////////////////////////////////////////////////////////////////////////////////

var gDisplaySizeDocked   = { width: 130, height: 67 }
var gDisplaySizeUnDocked = { width: 264, height: 194 }
var gDefaultRefreshInterval = 60; // Minute
var gDefaultPollingForServiceExistence = 1; // Minute
var gDefaultSunRise = "06:30:00";
var gDefaultSunSet  = "18:30:00";
var gDefaultBackDrop = "BLUE";
var gDefaultWeatherLocation = getLocalizedString('DefaultCity');
var gDefaultWeatherLocationCode = getLocalizedString('DefaultLocationCode');
var gDefaultDisplayDegreesIn = getLocalizedString('DefaultUnit');

System.Gadget.Flyout.onShow = refreshFlyoutValues;

var MicrosoftGadget = new WeatherGadget();

////////////////////////////////////////////////////////////////////////////////
//
// setup() - triggered by body.onload event
//
////////////////////////////////////////////////////////////////////////////////
function setup()
{
  // If we are in BIDI Mode, apply some special css to help folks read things Right to Left
  if (gBIDIMode)
  {
    document.body.className = 'BIDI';
  }

  setDisplayMode();

  if (MicrosoftGadget.isValid)
  {
    MicrosoftGadget.refreshSettings();
  }
  else
  {
    // The only way that we can get here is if the Service itself is invalid.
    // Therefore, no need to set up refresh intervals, etc.
    showOrHideServiceError( true );
  }

  // Hook the various events to our custom support functions
  if (gGadgetMode)
  {
    System.Gadget.settingsUI="settings.html";
    System.Gadget.onSettingsClosed  = function(event)
    {
      MicrosoftGadget.refreshSettings();
    }
    System.Gadget.onDock   = function()
    {
      setDisplayMode();
    }
    System.Gadget.onUndock = function()
    {
      setDisplayMode();
    }
    System.Gadget.onShowSettings = function()
    {
      MicrosoftGadget.suspendPeriodicRefresh();
      if ( MicrosoftGadget.pollingForServiceExistenceIsRunning )
      {
        MicrosoftGadget.endPollingForServiceExistence();
      }
      MicrosoftGadget.wasPollingForServiceExistence = false;
    }
    System.Gadget.visibilityChanged = function()
    {
      if (! System.Gadget.visible )
      {
        MicrosoftGadget.suspendPeriodicRefresh()
        if ( MicrosoftGadget.pollingForServiceExistenceIsRunning )
        {
          MicrosoftGadget.endPollingForServiceExistence();
          MicrosoftGadget.wasPollingForServiceExistence = true;
        } else {
          MicrosoftGadget.wasPollingForServiceExistence = false;
        }
      }
      else
      {
        if ( MicrosoftGadget.wasPollingForServiceExistence )
        {
          // If our last state was trying to reconnect to the network, resume doing that
          MicrosoftGadget.beginPollingForServiceExistence();
        }
        else
        {
          // Normal course of events is to come back into visible state and to begin anew
          MicrosoftGadget.refreshSettings();
        }
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
//
// WeatherGadget() - main Constructor
//
////////////////////////////////////////////////////////////////////////////////
function WeatherGadget()
{

  var self = this;

	////////////////////////////////////////////////////////////////////////////////
	//
	// Modify by Domain / Dorice, dyhan81
	//
	////////////////////////////////////////////////////////////////////////////////
	function f2c(degree)
	{
		return (isNaN(degree)?0:((degree - 32) / 1.8).toFixed(0));
	}

	function c2f(degree)
	{
		return (isNaN(degree)?0:(degree * 1.8 + 32).toFixed(0));
	}

	function ForecastData()
	{
		var SkyCode;
		var SkyText;
		var High;
		var Low;
		var Date;
		var Day;
		var Precip;
	}

	function ForecastArray(n)
	{
		for(var i = 0; i < n; i++)
			this[i] = new ForecastData();
	}

	function WeatherData()
	{
		var RetCode = 0;
		var RequestPending;
		var Count = 0;

		// Weather Properties Data
		var Location;
		var Url;
		var ImageRelUrl;
		var DegreeType;
		var Attribution;
		var Attribution2;
		var Latitude;
		var Longitude;
		var Timezone;

		// Current
		var Temperature;
		var SkyCode;
		var SkyText;
		var ObservDate;
		var ObservDay;
		var ObservTime;
		var ObservPoint;
		var Feelslike;
		var Humidity;
		var WindSpeed;

		// Forcast
        var ForecastA = new ForecastArray(5);
        var ForecastTodayIndex;

		this.item = function(i) {
			return this;
		}
		this.makeForecast = function(i, c, t, h, l, dt, dy, p) {
			ForecastA[i].SkyCode = c;
			ForecastA[i].SkyText = t;
			ForecastA[i].High    = h;
			ForecastA[i].Low     = l;
			ForecastA[i].Date    = dt;
			ForecastA[i].Day     = dy;
			ForecastA[i].Precip  = p;
		}
		this.Forecast = function(i) {
			return ForecastA[i];
		}
		this.TodayForecast = function() {
			return ForecastA[this.ForecastTodayIndex];
		}
	}

	function MSNWeather(){
		var RequestPending = false;
		var RefreshInterval = gDefaultRefreshInterval;
		var Celsius = ( gDefaultDisplayDegreesIn == "Celsius" );
		var strSunRise = "";
		var strNoon    = "";
		var strSunSet  = "";
	}

	MSNWeather.prototype={
		SearchByCode:function(locCode, degreeType){
			var self = this;
			var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
			xmlDoc.async=true;
			xmlDoc.onreadystatechange = function() {
				if (xmlDoc.readyState == 4)
				{
				    var wdata = new WeatherData();
					if(xmlDoc.parseError.errorCode == 0)
					{
						var isNeedToConvert = false;

						wdata.Location     = toLocalizedString(xmlDoc.selectSingleNode("/weatherdata/weather/@weatherlocationname").value);
						wdata.Url          = xmlDoc.selectSingleNode("/weatherdata/weather/@url").value + "&setunit=" + degreeType;
						wdata.ImageRelUrl  = xmlDoc.selectSingleNode("/weatherdata/weather/@imagerelativeurl").value;
						wdata.DegreeType   = xmlDoc.selectSingleNode("/weatherdata/weather/@degreetype").value; // F (Fahrenheit), C (Celsius)
						wdata.Attribution  = xmlDoc.selectSingleNode("/weatherdata/weather/@attribution").value;
						wdata.Attribution2 = xmlDoc.selectSingleNode("/weatherdata/weather/@attribution2").value;
						wdata.Latitude     = parseFloat(xmlDoc.selectSingleNode("/weatherdata/weather/@lat").value);
						wdata.Longitude    = parseFloat(xmlDoc.selectSingleNode("/weatherdata/weather/@long").value);
						wdata.Timezone     = parseInt(xmlDoc.selectSingleNode("/weatherdata/weather/@timezone").value);

						wdata.Temperature  = parseInt(xmlDoc.selectSingleNode("/weatherdata/weather/current/@temperature").value);
						wdata.SkyCode      = parseInt(xmlDoc.selectSingleNode("/weatherdata/weather/current/@skycode").value);
						wdata.SkyText      = toLocalizedString(xmlDoc.selectSingleNode("/weatherdata/weather/current/@skytext").value);
						wdata.ObservDate   = xmlDoc.selectSingleNode("/weatherdata/weather/current/@date").value;
						wdata.ObservDay    = xmlDoc.selectSingleNode("/weatherdata/weather/current/@day").value;
						wdata.ObservTime   = xmlDoc.selectSingleNode("/weatherdata/weather/current/@observationtime").value;
						wdata.ObservPoint  = toLocalizedString(xmlDoc.selectSingleNode("/weatherdata/weather/current/@observationpoint").value);
						wdata.Feelslike    = parseInt(xmlDoc.selectSingleNode("/weatherdata/weather/current/@feelslike").value);
						wdata.Humidity     = parseInt(xmlDoc.selectSingleNode("/weatherdata/weather/current/@humidity").value);
						wdata.WindSpeed    = parseInt(xmlDoc.selectSingleNode("/weatherdata/weather/current/@windspeed").value);
						wdata.WindSpeedT   = toLocalizedString(xmlDoc.selectSingleNode("/weatherdata/weather/current/@winddisplay").value);

						wdata.ImageRelUrl = (wdata.ImageRelUrl.charAt(wdata.ImageRelUrl.length - 1) != "/") ? (wdata.ImageRelUrl + "/") : wdata.ImageRelUrl;

						isNeedToConvert = self.Celsius && (wdata.DegreeType == "F") || !self.Celsius && !(wdata.DegreeType == "F");
						if (isNeedToConvert)
							if (wdata.DegreeType == "F")
							{
						  	wdata.Temperature = f2c(wdata.Temperature);
						  	wdata.Feelslike   = f2c(wdata.Feelslike);
						  }
						  else
						  {
						  	wdata.Temperature = c2f(wdata.Temperature);
						  	wdata.Feelslike   = c2f(wdata.Feelslike);
						  }
						else
						{
							wdata.Temperature = isNaN(wdata.Temperature)?NaN:wdata.Temperature;
							wdata.Feelslike   = isNaN(wdata.Feelslike)?NaN:wdata.Feelslike;
						}

                        wdata.ForecastTodayIndex = 0;
						for (var i = 1; i <= 5; i++)
						{
							var node = xmlDoc.documentElement.childNodes[0].childNodes[i];
							var SkyCode = parseInt(node.getAttribute("skycodeday"));
							var SkyText = toLocalizedString(node.getAttribute("skytextday"));
							var High    = parseInt(node.getAttribute("high"));
							var Low     = parseInt(node.getAttribute("low"));
							if (isNeedToConvert)
								if (wdata.DegreeType == "F")
								{
								  High = f2c(High);
								  Low  = f2c(parseInt(Low));
								}
								else
								{
								  High = c2f(High);
								  Low  = c2f(parseInt(Low));
								}
							else
							{
								High = isNaN(High)?0:High;
								Low = isNaN(Low)?0:Low;
							}
							var Date    = node.getAttribute("date");
							var Day     = node.getAttribute("day");
							var Precip  = parseInt(node.getAttribute("precip"));
							wdata.makeForecast(i-1, SkyCode, SkyText, High, Low, Date, Day, Precip);
                            if (wdata.ObservDate == Date)
                                wdata.ForecastTodayIndex = i - 1;
						}

						wdata.RetCode = 200;
						wdata.Count = 1;
					}
    			    self.OnDataReady(wdata);
				}
			};
            var r = xmlDoc.load("http://weather.service.msn.com/data.aspx?src=vista&wealocations=" + locCode + "&weadegreetype=" + degreeType);
		},
		OnDataReady:function(data){}
	}

  ////////////////////////////////////////////////////////////////////////////////
  //
  // Public Members
  //
  ////////////////////////////////////////////////////////////////////////////////
  this.isValid = true;
  this.statusMessage = "";
  this.weatherLocation     = gDefaultWeatherLocation;
  this.weatherLocationCode = gDefaultWeatherLocationCode;
  this.displayDegreesIn    = gDefaultDisplayDegreesIn;
  this.SunRise             = gDefaultSunRise;
  this.SunSet              = gDefaultSunSet;
  this.offsetFromLocalTime = 0;
  this.refreshInterval     = gDefaultRefreshInterval;

  this.spinner =  null;
  this.status = 200;
//  try
//  {
    // Connect to Weather Service .dll
//    var oMSN = new ActiveXObject("wlsrvc.WLServices");
//    this.oMSN = oMSN.GetService("weather");
//  }
//  catch (objException)
//  {
//    this.isValid = false;
//    this.statusMessage = getLocalizedString('ServiceNotAvailable');
  if (this.oMSN != null)
  {
  	this.oMSN.xmlDoc.abort();
  }
  this.oMSN = new MSNWeather();
//  }

  ////////////////////////////////////////////////////////////////////////////////
  //
  // Public Methods
  //
  ////////////////////////////////////////////////////////////////////////////////
  this.onUpdate           = refreshEverything;
  this.oMSN.OnDataReady   = onDataReadyHandler;

  ////////////////////////////////////////////////////////////////////////////////
  //
  // requestUpdate - request update from Weather Feed.
  //
  ////////////////////////////////////////////////////////////////////////////////
  this.requestUpdate =  function()
  {
    self.statusMessage='Requesting Update...';
    self.spinner.start();
    showOrHideGettingDataMessage( true );
    self.oMSN.Celsius = ( self.displayDegreesIn == "Celsius" );
    self.oMSN.SearchByCode( self.weatherLocationCode, self.displayDegreesIn.charAt(0).toUpperCase() );
  }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // refreshSettings - populate values with stored settings
  //                   and request update(s) of Weather data from Service
  //
  ////////////////////////////////////////////////////////////////////////////////
  this.refreshSettings = function ()
  {
   
    self.statusMessage='RefreshSettings';

     
    self.weatherLocation     = unescape(readSetting("WeatherLocation")) || getPersistentSettingInternal("WeatherLocation") || gDefaultWeatherLocation;
    self.weatherLocationCode = URLDecode(readSetting("WeatherLocationCode")) || getPersistentSettingInternal("WeatherLocationCode") || gDefaultWeatherLocationCode;
    self.displayDegreesIn    = readSetting("DisplayDegreesIn") || getPersistentSettingInternal("DisplayDegreesIn") || gDefaultDisplayDegreesIn;
    // Compute frequency of refresh
    if (self.oMSN.RefreshInterval > 0 )
    {
      self.refreshInterval = self.oMSN.RefreshInterval;
    }
    else
    {
      self.refreshInterval = readSetting("RefreshInterval");
    }
    self.refreshInterval = ( self.refreshInterval || gDefaultRefreshInterval ) * 60 * 1000;

    if (self.spinner == null)
    {
      // Only need to do this once, but must wait for the page to load first
      self.spinner = new getSpinner( "PleaseWaitLoadingSpinner" );
      self.spinner.hide();
    }
    self.oMSN.OnDataReady = onDataReadyHandler;
    self.requestUpdate();
    self.beginPeriodicRefresh();
  }

  ////////////////////////////////////////////////////////////////////////////////
  //
  // beginPeriodicRefresh - begins periodic polling of weather service for updates
  //
  ////////////////////////////////////////////////////////////////////////////////
  this.beginPeriodicRefresh = function()
  {
    // Clear any pending refresh requests first
    self.suspendPeriodicRefresh();
    self.endPollingForServiceExistence();
    // Set up recurring requests for updates*
    self.interval_RefreshTemperature = setInterval( "MicrosoftGadget.requestUpdate()", self.refreshInterval);
    self.periodicRefreshIsRunning = true;
  }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // suspendPeriodicRefresh - cancels polling of weather service for updates
  //
  ////////////////////////////////////////////////////////////////////////////////
  this.suspendPeriodicRefresh = function()
  {
    clearInterval( self.interval_RefreshTemperature );
    clearInterval( MicrosoftGadget.interval_RefreshTemperature );
    self.periodicRefreshIsRunning = false;
  }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // beginPollingForServiceExistence - when network connectivity is lost,
  // begin special polling testing for it to come back.
  //
  ////////////////////////////////////////////////////////////////////////////////
  this.beginPollingForServiceExistence = function()
  {
    // Clear any pending refresh requests first
    self.suspendPeriodicRefresh();
    self.endPollingForServiceExistence();

    // Remap the onDataReady Handler
    self.oMSN.OnDataReady = isDataReadyHandler;
    self.pollingForServiceExistence = setInterval( "MicrosoftGadget.oMSN.SearchByCode('" + self.weatherLocationCode + "', '" + self.displayDegreesIn.charAt(0).toUpperCase() + "')", gDefaultPollingForServiceExistence * 60 * 1000);
    self.pollingForServiceExistenceIsRunning = true;
  }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // endPollingForServiceExistence - cancel special network connectivity polling
  //
  ////////////////////////////////////////////////////////////////////////////////
  this.endPollingForServiceExistence = function()
  {
    clearInterval( self.pollingForServiceExistence );
    clearInterval( MicrosoftGadget.pollingForServiceExistence );
    self.pollingForServiceExistenceIsRunning = false;
  }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // weatherState() - Computes generalized state of weather [Sunny, Cloudy, etc.]
  // for all SkyCodes. Determines what image is used to represent...
  //
  ////////////////////////////////////////////////////////////////////////////////
  self.WeatherState = function()
  {
    switch ( self.SkyCode )
    {
        case (26) : case (27) : case (28) :
            theWeatherState = "cloudy";
            break;
        case (35) : case (39) : case (45) : case (46) :
            theWeatherState = "few-showers";
            break;
        case (19) : case (20) : case (21) : case (22) :
            theWeatherState = "foggy";
            break;
        case (29) : case (30) : case (33) :
            theWeatherState = "partly-cloudy";
            break;
        case (5) : case (13) : case (14) : case (15) : case (16) : case (18) : case (25) : case (41) : case (42) : case (43) :
            theWeatherState = "snow";
            break;
        case (1) : case (2) : case (3) : case (4) : case (37) : case (38) : case (47) :
            theWeatherState = "thunderstorm";
            break;
        case (31) : case (32) : case (34) : case (36) : case (44) :        // Note 44- "Data Not Available"
            theWeatherState = "sun";
            break;
        case (23) : case (24) :
            theWeatherState = "windy";
            break;
        case (9) : case (10) : case (11) : case (12) : case (40) :
            theWeatherState = "Rainy";
            break;
        case (6) : case (7) : case (8) : case (17) :
            theWeatherState = "hail";
            break;
        default:
            theWeatherState = "sun";
            break;
      }
      return theWeatherState;
    }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // isNight - boolean indicating whether its currently night *wherever*
  //
  ////////////////////////////////////////////////////////////////////////////////
  this.isNight = function()
  {
    var curTime = new Date();
    // Before SunRise or after Sunset means it's Night
    var deltaTime = self.SunSet - curTime;
    deltaTime = deltaTime / (1000 * 60 * 60);
    if (deltaTime > 24)
        curTime = new Date(curTime.getTime() + 24 * 60 * 60 * 1000);
    else if (deltaTime < 0)
        curTime = new Date(curTime.getTime() - 24 * 60 * 60 * 1000);

    return ( (  curTime < self.SunRise ) || ( curTime > self.SunSet ) );
  }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // makesSenseToDisplayTheMoon - boolean indicating whether it makes sense to
  //                              display the moon.  Dependant on weather state
  //
  ////////////////////////////////////////////////////////////////////////////////
  this.makesSenseToDisplayTheMoon = function()
  {
    var retVal = false;
    if ( self.isNight() )
    {
      var theWeatherState = self.WeatherState();
      if ( ( theWeatherState=="sun" ) || ( theWeatherState=="partly-cloudy" )  )
      {
        retVal = true;
      }
    }
    return retVal;
  }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // self.backdrop - returns backdrop color required for active weather state
  //
  ////////////////////////////////////////////////////////////////////////////////
  self.backdrop =  function()
  {
    var theBackground = "BLUE";
    var theDisplayMode = activeDisplayMode();

    switch ( self.SkyCode )
    {
      case (26) : case (27) : case (28) :
      case (35) : case (39) : case (45) : case (46) :
      case (19) : case (20) : case (21) : case (22) :
      case (1) : case (2) : case (3) : case (4) : case (5) : case (37) : case (38) : case (47) :
      case (9) : case (10) : case (11) : case (12) : case (40) : case (41) : case (42) : case (43) :
      case (6) : case (7) : case (8) : case (17) : case (13) : case (14) : case (15)  : case (16) : case (18) :
        theBackground = "GRAY";
        break;
      case (29) : case (30) : case (33) : case (34) :
      case (31) : case (32) : case (36) : case (44) :
      case (23) : case (24) : case (25) : default :
        theBackground = "BLUE";
        break;
    }

    if (self.isNight())
    {
      theBackground = "BLACK";
    }
    if ( !self.isValid )
    {
      theBackground = "BLUE";
    }
    if (theDisplayMode=='docked')
    {
      theBackground = theBackground + theDisplayMode;
    }
    return theBackground;
  }

  ////////////////////////////////////////////////////////////////////////////////
  //
  // HighTemp() - use tomorrow's High as an approximation
  //              if today's High cannot be returned by service
  //
  ////////////////////////////////////////////////////////////////////////////////
  /*this.HighTemp = function()
  {
    var theHighTemp = 0;
    try
    {
      theHighTemp = self.oMSNWeatherService.Forecast(0).High;
      if (theHighTemp == 0)
      {
        theHighTemp = self.oMSNWeatherService.Forecast(1).High;
      }
    }
    catch (objException)
    {
    }
    return theHighTemp;
  }*/


  ////////////////////////////////////////////////////////////////////////////////
  //
  // Private Methods
  //
  ////////////////////////////////////////////////////////////////////////////////

  ////////////////////////////////////////////////////////////////////////////////
  //
  // onDataReadyHandler( data )  - processes data returned by Weather Feed
  //                              (asynchronous callback)
  // Modified by dyhan81
  //
  ////////////////////////////////////////////////////////////////////////////////
  function onDataReadyHandler( data )
  {
    if (data !== undefined)
    {
      self.statusMessage='Update Received.';
      self.status  = data.RetCode;
      // RetCode==0 also "No Content" (XML parse error)
      if (data.RetCode!=0 && data.Count > 0 && data.item(0))
      {
        self.oMSNWeatherService = data.item(0);
        // Compute SunRise/SunSet times based on latitude/longitude returned by the feed for location.
        var theSunRiseSunset = computeSunRiseSunSet( self.oMSNWeatherService.Latitude, self.oMSNWeatherService.Longitude, self.oMSNWeatherService.Timezone);  // Note - using GMT (no TimeZone offset)
        self.SunRise   = theSunRiseSunset.SunRise;
        self.SunSet    = theSunRiseSunset.SunSet;
        self.strSunRise  = theSunRiseSunset.strSunRise;
        self.strNoon     = theSunRiseSunset.strNoon;
        self.strSunSet   = theSunRiseSunset.strSunSet;
        self.MoonState = function()
        {
          return computePhaseOfMoon(new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate());
        }
        self.SkyCode = self.oMSNWeatherService.SkyCode;
      } else {
        // In the case of "No Content", service will return 200 "success", but no data
        if (self.status==200)
        {
          // Actual HTTP Error code for "No Content"
          self.status = 204;
        }
      }
      // Gadget is valid if we have a 200 retVal
      self.isValid = ( self.status == 200 );
    }

    self.spinner.stop();
    showOrHideGettingDataMessage( false );

	// RetCode == 0 also "No Content" (XML parse error)
    if (data.RetCode != 0 && self.isValid)
    {
      self.onUpdate();
    }
    else
    {
      // When we get in this state, begin a special polling for the service coming
      // back online or otherwise correcting itself
      showOrHideServiceError( true, self.status );
      self.suspendPeriodicRefresh();
      // Only poll for Service Existence if it's available in the market
      if ( self.status != 1506 )
      {
        self.beginPollingForServiceExistence();
      }
      setDisplayMode();
    }
  }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // isDataReadyHandler( data ) - special handler for use when the service is
  //                              down or otherwise unresponsive
  //
  ////////////////////////////////////////////////////////////////////////////////
  function isDataReadyHandler( data )
  {
    if (data.RetCode==200 && !data.RequestPending)
    {
      self.endPollingForServiceExistence();
      self.isValid = true;
      MicrosoftGadget.isValid = true;
      self.oMSN.OnDataReady = onDataReadyHandler;
      self.requestUpdate();
      self.beginPeriodicRefresh();
    }
  }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // computeSunRiseSunSet(Latitude, Longitude, TimeZone)
  //                     Computes SunRise/SunSet based on Latitude/Longitude
  // Return: Object retVal {
  //           Date SunRise,
  //           Date SunSet,
  //           String str    // Sun Rise, Sun Set (transformed by TimeZone)
  //         };
  //
  ////////////////////////////////////////////////////////////////////////////////
  function computeSunRiseSunSet(Latitude, Longitude, TimeZone)
  {
  	var curTime = new Date();

    // Variable names used: B5, C, C2, C3, CD, D, DR, H, HR, HS, L0, L5, M, MR, MS, N, PI, R1, RD, S1, SC, SD, str
    var retVal = new Object();
    var PI=Math.PI;
    var DR=PI/180;
    var RD=1/DR;
    var B5=Latitude;
    var L5=Longitude;
    var H =-1 * (curTime.getTimezoneOffset() / 60 * -1); // Local timezone
    // Overriding TimeZone to standardize on UTC
    // H = 0;
    var M =curTime.getMonth()+1;
    var D =curTime.getDate();
    B5=DR*B5;
    var N=parseInt(275*M/9)-2*parseInt((M+9)/12)+D-30;
    var L0=4.8771+.0172*(N+.5-L5/360);
    var C=.03342*Math.sin(L0+1.345);
    var C2=RD*(Math.atan(Math.tan(L0+C)) - Math.atan(.9175*Math.tan(L0+C))-C);
    var SD=.3978*Math.sin(L0+C);
    var CD=Math.sqrt(1-SD*SD);
    var SC=(SD * Math.sin(B5) + .0145) / (Math.cos(B5) * CD);
    if (Math.abs(SC)<=1)
    {
      var C3=RD*Math.atan(SC/Math.sqrt(1-SC*SC));
      var R1=6-H-(L5+C2+C3)/15;
      var HR=parseInt(R1);
      var MR=parseInt((R1-HR)*60);
      retVal.SunRise = parseTime(HR + ":" + MR);
      var TargetTimezoneOffset = (TimeZone * 60 * 60 * 1000) + (retVal.SunRise.getTimezoneOffset() * 60 * 1000);
      var transformedSunRise = new Date(retVal.SunRise.getTime() + TargetTimezoneOffset);
      var strSunRise = toLocalizedString("SunriseAt") + transformedSunRise.getHours() + ":" + (transformedSunRise.getMinutes()<10?"0"+transformedSunRise.getMinutes():transformedSunRise.getMinutes());
      var S1=18-H-(L5+C2-C3)/15;
      var HS=parseInt(S1);
      var MS=parseInt((S1-HS)*60);
      retVal.SunSet = parseTime(HS + ":" + MS);
      var transformedSunSet = new Date(retVal.SunSet.getTime() + TargetTimezoneOffset);
      var strSunSet = toLocalizedString("SunsetAt") + transformedSunSet.getHours() + ":" + (transformedSunSet.getMinutes()<10?"0"+transformedSunSet.getMinutes():transformedSunSet.getMinutes());
      retVal.Noon = new Date((retVal.SunRise.getTime() + retVal.SunSet.getTime()) / 2);
      var transformedNoon = new Date(retVal.Noon.getTime() + TargetTimezoneOffset);
      var strNoon = toLocalizedString("NoonAt") + transformedNoon.getHours() + ":" + (transformedNoon.getMinutes()<10?"0"+transformedNoon.getMinutes():transformedNoon.getMinutes());
    }
    else
    {
      if (SC>1)
      {
        // str="Sun up all day";
        strSunRise = ".";
        strNoon    = ".";
        strSunSet  = ".";
        var tDate = new Date();
        // Set Sunset to be in the future ...
        retVal.SunSet = new Date( tDate.getFullYear()+1, tDate.getMonth(), tDate.getDay(), tDate.getHours() );
        // Set Sunrise to be in the past ...
        retVal.SunRise = new Date( tDate.getFullYear()-1, tDate.getMonth(), tDate.getDay(), tDate.getHours()-1 );
      }
      if (SC<-1)
      {
        // str="Sun down all day";
        strSunRise = ".";
        strNoon    = ".";
        strSunSet  = ".";
        // Set Sunrise and Sunset to be in the future ...
        retVal.SunRise = new Date( tDate.getFullYear()+1, tDate.getMonth(), tDate.getDay(), tDate.getHours() );
        retVal.SunSet = new Date( tDate.getFullYear()+1, tDate.getMonth(), tDate.getDay(), tDate.getHours() );
      }
    }
    retVal.strSunRise = strSunRise;
    retVal.strNoon    = strNoon;
    retVal.strSunSet  = strSunSet;
    return retVal;
  }

  ////////////////////////////////////////////////////////////////////////////////
  //
  // computePhaseOfMoon(Year, Month, Day) - Computes Phase of Moon based on Date
  //
  ////////////////////////////////////////////////////////////////////////////////
  function computePhaseOfMoon(Year, Month, Day)
  {
    // Variable names used: J, K1, K2, K3, MM, P2, V, YY
    var P2 = 3.14159 * 2;
    var YY = Year - parseInt((12 - Month)/10);
    var MM = Month + 9;
    if (MM >= 12) { MM = MM-12; }
    var K1 = parseInt(365.25 * (YY+4712));
    var K2 = parseInt(30.6 * MM + .5);
    var K3 = parseInt(parseInt((YY/100) + 49) * .75) - 38;
    // J is the Julian date at 12h UT on day in question
    var J = K1+K2+Day+59;
    // Adjust for Gregorian calendar, if applicable
    if (J > 2299160) { J = J-K3; }
    // Calculate illumination (synodic) phase
    var V = (J - 2451550.1)/29.530588853;
    V = V - parseInt(V);
    // Normalize values to range from 0 to 1
    if (V<0) { V=V+1; }
    // Moon's age in days from New Moon
    var AG = V*29.53;

    switch (true)
    {
      // Each phase lasts approximately 3.28 days
      case ((AG > 27.6849270496875) || (AG <= 1.8456618033125)) :
        var retVal = 'New';
        break;
      case ((AG > 1.8456618033125) && (AG <= 5.5369854099375)) :
        var retVal = 'Waxing-Crescent';
        break;
      case ((AG > 5.5369854099375) && (AG <= 9.2283090165625)) :
        var retVal = 'First-Quarter';
        break;
      case ((AG > 9.2283090165625) && (AG <= 12.9196326231875)) :
        var retVal = 'Waxing-Gibbous';
        break;
      case ((AG > 12.9196326231875) && (AG <= 16.6109562298125)) :
        var retVal = 'Full';
        break;
      case ((AG > 16.6109562298125) && (AG <= 20.3022798364375)) :
        var retVal = 'Waning-Gibbous';
        break;
      case ((AG > 20.3022798364375) && (AG <= 23.9936034430625)) :
        var retVal = 'Last-Quarter';
        break;
      case ((AG > 23.9936034430625) && (AG <= 27.6849270496875)) :
        var retVal = 'Waning-Crescent';
        break;
      default :
        var retVal = 'Full';
        break;
    }
    return retVal;
  }

  ////////////////////////////////////////////////////////////////////////////////
  //
  // SGN(aNumber) - Returns an integer indicating the sign of a number
  //
  ////////////////////////////////////////////////////////////////////////////////
  function SGN(aNumber) {
    if (aNumber===undefined) { aNumber = 0; }
    var theNumber = parseFloat(aNumber);
    retVal = 0;
    if ( theNumber != 0 )
    {
      if (theNumber>0)
      {
        retVal = 1;
      }
      else
      {
        retVal = -1;
      }
    }
    return retVal;
  }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // parseTime(string aTime) - takes a string of time in the format HH:MM:SS
  //                           and returns Javascript Date Object
  //
  ////////////////////////////////////////////////////////////////////////////////
  function parseTime(aTime)
  {
    var aDateTimeObject = 'none';
    if (aTime!==undefined && aTime.length)
    {
      aDateTimeObject = GMTTime();
      try
      {
        var theHour    = parseInt(aTime.split(':')[0]);
        var theMinutes = parseInt(aTime.split(':')[1]);
        aDateTimeObject.setHours(theHour);
        aDateTimeObject.setMinutes(theMinutes);
      }
      catch (ex)
      {
      }
    }
    return aDateTimeObject;
  }
  ////////////////////////////////////////////////////////////////////////////////
  //
  // GMTTime() - returns time adjusted to GMT (Universal Time)
  //
  ////////////////////////////////////////////////////////////////////////////////
  function GMTTime()
  {
    var aDate = new Date();
    var aDateAdjustedToGMTInMS = aDate.getTime() + (aDate.getTimezoneOffset() * 60 * 1000);
    return ( new Date( aDateAdjustedToGMTInMS ) );
  }
}

// *** END WeatherGadget Object Constructor ***

////////////////////////////////////////////////////////////////////////////////
//
// Routines for Refreshing Display
//
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//
// setDisplayMode() - resets gadget size and background based on current host
//
////////////////////////////////////////////////////////////////////////////////
function setDisplayMode()
{
  showOrHide('DockedModeDisplayArea',false);
  showOrHide('UnDockedModeDisplayArea',false);

  var theWidth  = gDisplaySizeUnDocked.width;
  var theHeight = gDisplaySizeUnDocked.height;
  var theBackgroundImage = gDefaultBackDrop;
  var theActiveDisplayArea;

  switch ( activeDisplayMode() )
  {
    case "undocked" : // "undocked"
      theActiveDisplayArea = 'UnDockedModeDisplayArea';
      theWidth  = gDisplaySizeUnDocked.width;
      theHeight = gDisplaySizeUnDocked.height;
      document.getElementById('PlaceHrefUnDockedMode').tabIndex = 1;
      document.getElementById('DayOfWeek1').tabIndex = 5;
      document.getElementById('DayOfWeek2').tabIndex = 5;
      document.getElementById('DayOfWeek3').tabIndex = 5;
      document.getElementById('UnDockedModeDisplayArea').className = MicrosoftGadget.backdrop();
      refreshUnDockedModeValues( MicrosoftGadget );
      break;

    case "docked" : default : // "docked"
      theActiveDisplayArea = 'DockedModeDisplayArea';
      theWidth  = gDisplaySizeDocked.width;
      theHeight = gDisplaySizeDocked.height;
      document.getElementById('DockedModeDisplayArea').className = MicrosoftGadget.backdrop();
      refreshDockedModeValues( MicrosoftGadget );
      break;
  }

  document.body.style.width  = theWidth;
  document.body.style.height = theHeight;

  background.style.width = theWidth;
  background.style.height = theHeight;

  if ( MicrosoftGadget.isValid )
  {
    setBackground( 'images/' + MicrosoftGadget.backdrop() + '-base');
  }
  // Only show the data layers if we have data
  showOrHide(theActiveDisplayArea, MicrosoftGadget.isValid);

  if (!MicrosoftGadget.isValid)
  {
    showOrHide('WeatherMessage', true);
  }
}
////////////////////////////////////////////////////////////////////////////////
//
// refreshEverything() -  update display for all modes with active data
//
////////////////////////////////////////////////////////////////////////////////
function refreshEverything()
{
 refreshDockedModeValues( this );
 refreshUnDockedModeValues( this );
 setDisplayMode();
}
////////////////////////////////////////////////////////////////////////////////
//
// refreshDockedModeValues() - Refreshes display of Docked window
//
////////////////////////////////////////////////////////////////////////////////
function refreshDockedModeValues( oWeatherGadget )
{
  if (!oWeatherGadget.isValid || oWeatherGadget.oMSNWeatherService === undefined)
  {
    // Since the weather service can become invalidated at any time (not necessarily
    // onRefreshSettings), we must manually set isValid to false if the service
    // becomes undefined
    showOrHideServiceError(true, oWeatherGadget.status);
    return;
  }

  showOrHideServiceError(false);
  document.getElementById('PlaceHrefDockedMode').href = cleanURL( oWeatherGadget.oMSNWeatherService.Url );
  document.getElementById('PlaceHrefDockedMode').innerText = oWeatherGadget.oMSNWeatherService.Location;

  var theAltText = '"' + oWeatherGadget.oMSNWeatherService.SkyText + '"';
  var theAltDetailText = ""
  							 + "\n" +oWeatherGadget.oMSNWeatherService.Feelslike + "\xb0, "
                 + oWeatherGadget.oMSNWeatherService.Humidity + "%, "
                 + oWeatherGadget.oMSNWeatherService.WindSpeedT + "\n"
                 + oWeatherGadget.oMSNWeatherService.ObservTime + " ("
                 + oWeatherGadget.oMSNWeatherService.ObservPoint + ")\n"
                 ;

  showOrHide( 'WeatherStateDockedMode', true);

  if ( oWeatherGadget.SkyCode != 44 )
  {
    setImage( 'WeatherStateDockedMode', 'images/docked_' + oWeatherGadget.WeatherState() + '.png');
  }
  else
  {
    setImage( 'WeatherStateDockedMode', 'images/1px.gif');
  }

  if ( oWeatherGadget.makesSenseToDisplayTheMoon() )
  {
    showOrHide('OrbStateDockedMode', true);
    setImage( 'OrbStateDockedMode', 'images/docked_moon-' + oWeatherGadget.MoonState() + '.png');

    // For NightTime Weather states, show additional Moon Phase tooltip
    theAltText += " - " + getLocalizedString( 'Night-' + oWeatherGadget.MoonState());

    // Hide Weatherstate if we have clear skies, otherwise graphic includes a sun
    // which doesn't make sense to show at night
    if ( oWeatherGadget.WeatherState()=='sun' )
    {
      showOrHide( 'WeatherStateDockedMode', false);
      // Hang the accessbility info. off of OrbState,
      // since weather state is hidden in this case
      document.getElementById('OrbStateDockedMode').alt = theAltText + theAltDetailText;
    }
  }
  else
  {
    showOrHide('DropShadowDockedMode', false);
    showOrHide('OrbStateDockedMode', false);
  }

  if ( oWeatherGadget.oMSNWeatherService.Temperature || oWeatherGadget.oMSNWeatherService.Temperature == 0 )
  {
    document.getElementById('TemperatureCurrent').innerHTML = oWeatherGadget.oMSNWeatherService.Temperature + "&#176;";
  }
  else
  {
    // In the unlikely event data is “Not Available”, do not display a temperature
    document.getElementById('TemperatureCurrent').innerHTML = " - ";
  }

  document.getElementById('WeatherStateDockedMode').alt = theAltText + theAltDetailText;
  document.getElementById('DockedModeHighlight2').alt = theAltText + theAltDetailText;

  setImage( 'DockedModeHighlight1', 'images/' + oWeatherGadget.backdrop() + '-highlight-01.png');
  setImage( 'DockedModeHighlight2', 'images/' + oWeatherGadget.backdrop() + '-highlight-02.png');
}


////////////////////////////////////////////////////////////////////////////////
//
// cleanURL( sUrl ) - Verifies that the URL starts with http://
//
////////////////////////////////////////////////////////////////////////////////
function cleanURL( sURL )
{
    var safeUrl = " ";
    var httpIndex = sURL.search( "http://" );

    if ( httpIndex != 0 )
    {
        return safeUrl;
    }
    return sURL;
}
////////////////////////////////////////////////////////////////////////////////
//
// refreshUnDockedModeValues( oWeatherGadget ) - Refreshes UnDocked window
//
////////////////////////////////////////////////////////////////////////////////
function refreshUnDockedModeValues( oWeatherGadget )
{
  if (!oWeatherGadget.isValid || oWeatherGadget.oMSNWeatherService===undefined)
  {
    showOrHideServiceError(true,  oWeatherGadget.status);
    return;
  }

  showOrHideServiceError(false);
  document.getElementById('Attribution').innerText = oWeatherGadget.oMSNWeatherService.Attribution2;

  // Update Today's Forecast Temperatures
  document.getElementById('PlaceHrefUnDockedMode').href = cleanURL( oWeatherGadget.oMSNWeatherService.Url );
  document.getElementById('PlaceHrefUnDockedMode').innerText =  oWeatherGadget.oMSNWeatherService.Location;
  //document.getElementById('ConditionCurrentUnDockedMode').innerText = ((oWeatherGadget.oMSNWeatherService.SkyText==getLocalizedString('Not Available'))?"("+oWeatherGadget.oMSNWeatherService.Forecast(0).SkyText+")":oWeatherGadget.oMSNWeatherService.SkyText);
  //document.getElementById('TemperatureHigh0').innerHTML = oWeatherGadget.HighTemp() + "&#176;";
  //document.getElementById('TemperatureSeparator').innerHTML = '-';
  //document.getElementById('TemperatureLow0').innerHTML  = oWeatherGadget.oMSNWeatherService.Forecast(0).Low + "&#176;";

  var theCurrentConditionText = '"' + oWeatherGadget.oMSNWeatherService.SkyText + '"';
  var theTodayForcastText = '"' + oWeatherGadget.oMSNWeatherService.TodayForecast().SkyText + '"';
  var theCurrentConditionHTML =
  							   getLocalizedString("Current/Forcast")
  						//	 + '<img src="images/' +oWeatherGadget.SkyCode + '.gif" height=21px align="absmiddle" />'
  							 + '<img src="' + oWeatherGadget.oMSNWeatherService.ImageRelUrl + oWeatherGadget.SkyCode + '.gif" height=21px align="absmiddle" />'
  						//	 + '<img src="images/' + oWeatherGadget.SkyCode + '.png" height=21px align="absmiddle" />'
  							 + '<Strong>' + theCurrentConditionText + "</strong>"
  							 ;
	var theTodayForcastHTML =
								   "" // getLocalizedString("TodayForcast")
							//	 + '<img src="images/' + oWeatherGadget.oMSNWeatherService.Forecast(0).SkyCode + '.gif" height=21px align="absmiddle" />'
								 + '<img src="' + oWeatherGadget.oMSNWeatherService.ImageRelUrl + oWeatherGadget.oMSNWeatherService.TodayForecast().SkyCode + '.gif" height=21px align="absmiddle" />'
							//	 + '<img src="images/' + oWeatherGadget.oMSNWeatherService.Forecast(0).SkyCode + '.png" height=21px align="absmiddle" />'
								 + '<strong>' + theTodayForcastText + '</strong>'
								 ;
  var theCurrentMoonPhase = "";
  var theCurrentConditionDetailHTML =
  							   getLocalizedString("Feelslike") + oWeatherGadget.oMSNWeatherService.Feelslike + "\xb0, "
                 + getLocalizedString("Humidity") + oWeatherGadget.oMSNWeatherService.Humidity + "%, "
                 + getLocalizedString("WindSpeed") + oWeatherGadget.oMSNWeatherService.WindSpeedT
                 ;
	var theTodayForcastDetailHTML =
                   getLocalizedString("PrecipitationChance") + oWeatherGadget.oMSNWeatherService.TodayForecast().Precip + "%"
	var theObservationDetailHTML =
                   getLocalizedString("ObservTime") + oWeatherGadget.oMSNWeatherService.ObservDate + " "  + oWeatherGadget.oMSNWeatherService.ObservTime + ' (' + (oWeatherGadget.oMSNWeatherService.Timezone>0?'+'+oWeatherGadget.oMSNWeatherService.Timezone:oWeatherGadget.oMSNWeatherService.Timezone) + 'h)' + "<BR>"
                 + getLocalizedString("ObservPoint") + oWeatherGadget.oMSNWeatherService.ObservPoint
                 ;
  var theSunriseSunset = oWeatherGadget.strSunRise + ' / ' + oWeatherGadget.strNoon + ' / ' + oWeatherGadget.strSunSet;

  showOrHide( 'WeatherStateUnDockedMode', true);
  showOrHide('OrbStateUnDockedMode', true);

  if ( oWeatherGadget.SkyCode != 44 )
  {
    setImage( 'WeatherStateUnDockedMode', 'images/undocked_' + oWeatherGadget.WeatherState() + '.png');
  }
  else
  {
    setImage( 'WeatherStateUnDockedMode', 'images/1px.gif');
  }

  if ( oWeatherGadget.makesSenseToDisplayTheMoon() )
  {
    showOrHide('OrbStateUnDockedMode', true);
    setImage( 'OrbStateUnDockedMode', 'images/undocked_moon-' + oWeatherGadget.MoonState() + '.png')

    // For NightTime Weather states, show additional Moon Phase tooltip
    theCurrentMoonPhase = getLocalizedString( 'Night-' + oWeatherGadget.MoonState() );

    // Hide Weatherstate if we have clear skies, otherwise graphic includes a sun
    // which doesn't make sense to show at night
    showOrHide( 'WeatherStateUnDockedMode', !( oWeatherGadget.WeatherState()=='sun' ));
  }
  else
  {
    showOrHide('OrbStateUnDockedMode', false);
  }

  if ( oWeatherGadget.oMSNWeatherService.Temperature || oWeatherGadget.oMSNWeatherService.Temperature == 0 )
  {
    document.getElementById('TemperatureCurrentUnDockedMode').innerHTML = oWeatherGadget.oMSNWeatherService.Temperature + "&#176;";
  }
  else
  {
    document.getElementById('TemperatureCurrentUnDockedMode').innerHTML = " - ";
  }

  document.getElementById('UnDockedModeAccessibilityInformation').alt = theCurrentConditionText + ((theCurrentMoonPhase!="")?(" - " + theCurrentMoonPhase):"");
  document.getElementById('UnDockedModeCurrentConditionDetailLink').innerHTML = getLocalizedString('CurrentSky');
  document.getElementById('UnDockedModeCurrentConditionDetailCloser').innerHTML = getLocalizedString('Close');
  setImage( 'UnDockedModeHighlight1', 'images/' + oWeatherGadget.backdrop() + '-highlight-01.png');
  setImage( 'UnDockedModeHighlight2', 'images/' + oWeatherGadget.backdrop() + '-highlight-02.png');
  setImage( 'UnDockedModeCurrentConditionDetailBase', 'images/' + oWeatherGadget.backdrop() + '-base-part.png');
  document.getElementById('UnDockedModeCurrentConditionDetailText').innerHTML =
      '<table><tr><td>'
		+ theCurrentConditionHTML + '/' + theTodayForcastHTML	+ ((theCurrentMoonPhase!="")?(" - " + theCurrentMoonPhase + "<BR>"):"<BR>")
  	+ theCurrentConditionDetailHTML + ", " + theTodayForcastDetailHTML + "<BR>"
  	+ theSunriseSunset + "<BR>"
  	+ "<BR>"
  	+ theObservationDetailHTML
  	+ '</td></tr></table>';

  for (var i=0;i<5;i++)
  {
    with (oWeatherGadget.oMSNWeatherService.Forecast(i))
    {
      var theDate = parseDateFromString(Date);
      var theLowTemp = Low;
      var theHighTemp = High;
      // Code from 1 to 47 indicating Weather State (used to compute Icon to display)
      var theSkyCode = SkyCode;
      var thePrecip  = getLocalizedString("PrecipitationChance") + Precip + "%";

      document.getElementById('SkyCodeImage'+ i).alt = SkyText + " (" + thePrecip + ")";
      setImage( 'SkyCodeImage'+ i, 'images/' + theSkyCode + '.png');
      document.getElementById('DayOfWeek' + i).innerText = getLocalizedString(Day);
      document.getElementById('DayOfWeek' + i).href = oWeatherGadget.oMSNWeatherService.Url;
      document.getElementById('TemperatureHigh' + i).innerHTML = theHighTemp + "&#176;";
      document.getElementById('TemperatureLow' + i).innerHTML  = theLowTemp  + "&#176;";
    }
  }

  document.getElementById('DayOfWeek' + oWeatherGadget.oMSNWeatherService.ForecastTodayIndex).innerText = getLocalizedString('Today');
}
////////////////////////////////////////////////////////////////////////////////
//
// activeDisplayMode() - returns active display mode
//
////////////////////////////////////////////////////////////////////////////////
function activeDisplayMode()
{
  retVal = "docked";
  if (gGadgetMode)
  {
    retVal = System.Gadget.docked ? "docked" : "undocked";
  }
  return retVal;
}
////////////////////////////////////////////////////////////////////////////////
//
// parseDateFromString(string aString) - parses Date from a string extracted
// from MSN Weather Feed.  Returns a Date Object set to that time.
//
////////////////////////////////////////////////////////////////////////////////
function parseDateFromString(aString)
{
  if (aString.length) {
    // String received should be formatted like:   "2006-01-10" (yyyy-mm-dd)
    var aDateTimeObject = new Date();
    aDateTimeObject.setFullYear(parseInt(aString.split('-')[0]));
    aDateTimeObject.setMonth(parseInt(aString.split('-')[1])-1);
    aDateTimeObject.setDate(parseInt(aString.split('-')[2]));
    return aDateTimeObject;
  }
}
////////////////////////////////////////////////////////////////////////////////
//
// showOrHideGettingDataMessage() - Display/Hide "Getting Data" Message
//
////////////////////////////////////////////////////////////////////////////////
function showOrHideGettingDataMessage(bShow)
{
  showOrHide('WeatherMessage', bShow);
  showOrHide('PleaseWaitLoadingSpinner', bShow);
  showOrHide(activeDisplayMode() + 'ModeDisplayArea', !bShow);

  var oMessage = document.getElementById('message');
  if (bShow)
  {
    if (activeDisplayMode()=="undocked")
    {
      document.getElementById("WeatherMessage").className = 'unDockedWeatherMessage';
    }
    else
    {
      document.getElementById("WeatherMessage").className = 'dockedWeatherMessage';
    }
    oMessage.innerHTML = getLocalizedString('GettingData');
    setBackground('images/' + activeDisplayMode() + '-loading');
  }
  else
  {
    oMessage.innerHTML = "";
  }
  showOrHide( document.getElementById('WeatherMessageIcon'), false );
}
////////////////////////////////////////////////////////////////////////////////
//
// showOrHideServiceError() - Display/Hide "Service Not Available" Message
//
////////////////////////////////////////////////////////////////////////////////
function showOrHideServiceError(bShow, theStatusCode)
{
  var theImage = "";
  var theMessage = "";
  showOrHide('WeatherMessage', bShow);
  showOrHide('PleaseWaitLoadingSpinner', false);
  var oMessage     = document.getElementById('message');
  if (bShow)
  {
    if (activeDisplayMode()=="undocked")
    {
      document.getElementById("WeatherMessage").className = 'unDockedWeatherMessage';
    }
    else
    {
      document.getElementById("WeatherMessage").className = 'dockedWeatherMessage';
    }
    switch( theStatusCode )
    {
      case 1506:
        // Forbidden
        if (activeDisplayMode()=="undocked") {
          theMessage = getLocalizedString( 'ServiceNotAvailableInYourArea' );
        } else {
          theMessage = getLocalizedString( 'ServiceNotAvailable' );
        }
        document.getElementById('WeatherMessageIcon').alt = getLocalizedString( 'ServiceNotAvailableInYourArea' );
        oMessage.title = getLocalizedString( 'ServiceNotAvailableInYourArea' );
        break;
      case 204:
        // No Content
        theMessage = getLocalizedString( 'LocationDontExist' ) ;
        document.getElementById('WeatherMessageIcon').alt = getLocalizedString( 'LocationDontExist' );
        break;
      case 404: default:
        // Not Found
        theMessage = getLocalizedString( 'ServiceNotAvailable' );
        document.getElementById('WeatherMessageIcon').alt = getLocalizedString( 'ServiceNotAvailable' );
        break;
    }
    if (activeDisplayMode()=='docked')
    {
      setBackground( 'images/docked-loading' );
    }
    else
    {
      setBackground( 'images/undocked-loading' );
    }
  }
  showOrHide( document.getElementById('WeatherMessageIcon'), true );
  oMessage.innerHTML = '<span>' + theMessage + '<\/span>';
}

function setBackground(image)
{
  if (gGadgetMode)
  {
    background.src = image + ".png";
    background_.src = image + "_.png";
    //System.Gadget.background = "url(" + image + ".png)";
  }
  else
  {
    document.body.style.backgroundImage = "url(" + image + ".png)";
  }
}

function Left(str, n)
{
  if (n <= 0)     // Invalid bound, return blank string
    return "";
  else if (n > String(str).length)   // Invalid bound, return
    return str;                // entire string
  else // Valid bound, return appropriate substring
    return String(str).substring(0,n);
}


////////////////////////////////////////////////////////////////////////////////
//
// showFlyout ()
//
////////////////////////////////////////////////////////////////////////////////

function showFlyout ()
{
  if( System.Gadget.Flyout.show == false )
  {
     if ( MicrosoftGadget.isValid )
     {
       System.Gadget.Flyout.file = "flyout.html";
       System.Gadget.Flyout.show = true;
     }
  }else
     System.Gadget.Flyout.show = false;

}

////////////////////////////////////////////////////////////////////////////////
//
// setFlyoutValues () - set values for flyout
//
////////////////////////////////////////////////////////////////////////////////
function refreshFlyoutValues (){
  var fDoc = System.Gadget.Flyout.document; 
  var oWeatherGadget = MicrosoftGadget;
  var BackdropColor;

  switch ( Left( oWeatherGadget.backdrop(), 3) )
  {
    case 'BLU': BackdropColor = 'BLUE';
                break;
    case 'BLA': BackdropColor = 'BLACK';
                break;
    case 'GRA': BackdropColor = 'GRAY';
                break;
  }

  fDoc.getElementById('FlyoutDisplayArea').className = BackdropColor;
  fDoc.body.style.backgroundImage = "url(images/"+BackdropColor+"-flyout.png)";

  fDoc.getElementById('Attribution').innerText = oWeatherGadget.oMSNWeatherService.Attribution2;

  // Update Today's Forecast Temperatures
  fDoc.getElementById('PlaceFlyout').innerText =  oWeatherGadget.oMSNWeatherService.Location;
  //fDoc.getElementById('ConditionCurrentFlyout').innerText = ((oWeatherGadget.oMSNWeatherService.SkyText==getLocalizedString('Not Available'))?"("+oWeatherGadget.oMSNWeatherService.Forecast(0).SkyText+")":oWeatherGadget.oMSNWeatherService.SkyText);
  //fDoc.getElementById('TemperatureHigh0').innerHTML = oWeatherGadget.HighTemp() + "&#176;";
  //fDoc.getElementById('TemperatureSeparator').innerHTML = '-';
  //fDoc.getElementById('TemperatureLow0').innerHTML  = oWeatherGadget.oMSNWeatherService.Forecast(0).Low + "&#176;";

  var theCurrentConditionText = '"' + oWeatherGadget.oMSNWeatherService.SkyText + '"';
  var theTodayForcastText = '"' + oWeatherGadget.oMSNWeatherService.TodayForecast().SkyText + '"';
  var theCurrentConditionHTML = 
  							   getLocalizedString("Current(Forcast)")
  							 + '<img src="images/' + oWeatherGadget.SkyCode + '.gif" height=20px/>'
  							 + '<Strong>' + theCurrentConditionText + "</strong>"
  							 ;
	var theTodayForcastHTML =
								   "" // getLocalizedString("TodayForcast") 
								 + '<img src="images/' + oWeatherGadget.oMSNWeatherService.TodayForecast().SkyCode + '.gif" height=20px/>'
								 + '<strong>' + theTodayForcastText + '</strong>'
								 ;
  var theCurrentMoonPhase = "";
  var theCurrentConditionDetailHTML =
  							   getLocalizedString("Feelslike") + oWeatherGadget.oMSNWeatherService.Feelslike + "\xb0, "
                 + getLocalizedString("Humidity") + oWeatherGadget.oMSNWeatherService.Humidity + "%, "
                 + getLocalizedString("WindSpeed") + oWeatherGadget.oMSNWeatherService.WindSpeedT
                 ;
	var theTodayForcastDetailHTML =
                   getLocalizedString("PrecipitationChance") + oWeatherGadget.oMSNWeatherService.TodayForecast().Precip + "%"
	var theObservationDetailHTML =
                   getLocalizedString("ObservTime") + oWeatherGadget.oMSNWeatherService.ObservDate + " "  + oWeatherGadget.oMSNWeatherService.ObservTime + ' (' + (oWeatherGadget.oMSNWeatherService.Timezone>0?'+'+oWeatherGadget.oMSNWeatherService.Timezone:oWeatherGadget.oMSNWeatherService.Timezone) + 'h)' + "<BR>"
                 + getLocalizedString("ObservPoint") + oWeatherGadget.oMSNWeatherService.ObservPoint
                 ;
  var theSunriseSunset = oWeatherGadget.strSunRise + ' / ' + oWeatherGadget.strNoon + ' / ' + oWeatherGadget.strSunSet;

 
  if ( oWeatherGadget.SkyCode != 44 && !oWeatherGadget.makesSenseToDisplayTheMoon())
  {
    fDoc.getElementById('WeatherStateFlyout').src = 'images/undocked_' + oWeatherGadget.WeatherState() + '.png';
  }
  else
  {
    fDoc.getElementById( 'WeatherStateFlyout' ).src = 'images/1px.gif';  
  }

  if ( oWeatherGadget.makesSenseToDisplayTheMoon() ) 
  {

    fDoc.getElementById( 'OrbStateFlyout' ).src = 'images/undocked_moon-' + oWeatherGadget.MoonState() + '.png';

    // For NightTime Weather states, show additional Moon Phase tooltip
    theCurrentMoonPhase = getLocalizedString( 'Night-' + oWeatherGadget.MoonState() );
  } 

  if ( oWeatherGadget.oMSNWeatherService.Temperature && oWeatherGadget.oMSNWeatherService.Temperature != "" ) 
  {
    fDoc.getElementById('TemperatureCurrentFlyout').innerHTML = oWeatherGadget.oMSNWeatherService.Temperature + "&#176;";
  } 
  else
  {
    fDoc.getElementById('TemperatureCurrentFlyout').innerHTML = " - ";
  }

  fDoc.getElementById('FlyoutAccessibilityInformation').alt = theCurrentConditionText + ((theCurrentMoonPhase!="")?(" - " + theCurrentMoonPhase):"");
  fDoc.getElementById('FlyoutCurrentConditionDetailLink').innerHTML = getLocalizedString('CurrentSky');
  fDoc.getElementById('FlyoutCurrentConditionDetailCloser').innerHTML = getLocalizedString('Close');
  fDoc.getElementById('FlyoutHighlight1').src = 'images/' + BackdropColor + '-highlight-01.png';
  fDoc.getElementById('FlyoutHighlight2').src = 'images/' + BackdropColor + '-highlight-02.png';  
  fDoc.getElementById('FlyoutCurrentConditionDetailBase').src = 'images/' + BackdropColor + '-base-part.png';
  fDoc.getElementById('FlyoutCurrentConditionDetailText').innerHTML = 
      '<table><tr><td>'
		+ theCurrentConditionHTML + '/' + theTodayForcastHTML	+ ((theCurrentMoonPhase!="")?(" - " + theCurrentMoonPhase + "<BR>"):"<BR>")
  	+ theCurrentConditionDetailHTML + ", " + theTodayForcastDetailHTML + "<BR>"
  	+ theSunriseSunset + "<BR>"
  	+ "<BR>"
  	+ theObservationDetailHTML
  	+ '</td></tr></table>'; 

  for (var i=0;i<5;i++) 
  {
    with (oWeatherGadget.oMSNWeatherService.Forecast(i)) 
    {
      var theDate = parseDateFromString(Date);
      var theLowTemp = Low;
      var theHighTemp = High;
      // Code from 1 to 47 indicating Weather State (used to compute Icon to display)
      var theSkyCode = SkyCode;         
      var thePrecip  = getLocalizedString("PrecipitationChance") + Precip + "%";
      
      fDoc.getElementById('SkyCodeImage'+ i).alt = SkyText + " (" + thePrecip + ")"; 
      fDoc.getElementById('SkyCodeImage'+ i).src = 'images/' + theSkyCode + '.png';
      fDoc.getElementById('DayOfWeek' + i).innerText = getLocalizedString(Day); 
      fDoc.getElementById('DayOfWeek' + i).href = oWeatherGadget.oMSNWeatherService.Url;
      fDoc.getElementById('TemperatureHigh' + i).innerHTML = theHighTemp + "&#176;";
      fDoc.getElementById('TemperatureLow' + i).innerHTML  = theLowTemp  + "&#176;";
    }
  }

  fDoc.getElementById('DayOfWeek' + oWeatherGadget.oMSNWeatherService.ForecastTodayIndex).innerText = getLocalizedString('Today');
  
}

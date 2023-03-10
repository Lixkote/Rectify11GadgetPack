////////////////////////////////////////////////////////////////////////////////
//
//  THIS CODE IS NOT APPROVED FOR USE IN/ON ANY OTHER UI ELEMENT OR PRODUCT COMPONENT.
//  Copyright (c) 2006 Microsoft Corporation.  All rights reserved.
//  Modify by Domain / Dorice
//
////////////////////////////////////////////////////////////////////////////////

var gDefaultWeatherLocation = getLocalizedString('DefaultCity');
var gDefaultWeatherLocationCode = getLocalizedString('DefaultLocationCode');
var gDefaultDisplayDegreesIn = getLocalizedString('DefaultUnit');
var gDefaultInputHelperString = getLocalizedString('EnterACityName');
var gDefaultDockedSize = getLocalizedString('DefaultDockedSize');
var gDefaultUnDockedSize = getLocalizedString('DefaultUnDockedSize');

function MSNResultItem()
{
	var LocationCode;
	var ZipCode;
	var Location;
	var Fullname;
	var SearchDistance;
	var SearchScore;
	var SearchLocation;
}

function ItemArray(count)
{
	for( var i = 0; i < count; i++ )
	  this[i] = new MSNResultItem();
}

function MSNSearchResult()
{
	var Count;
	var RetCode;
	var ItemA;
	this.makeItem = function(n) {
		ItemA = new ItemArray(n);
	}
	this.item = function(i) {
		return ItemA[i];
	}
}

function MSNSearch()
{
	
}

MSNSearch.prototype={
	SearchByLocation:function(loc){
		var self = this;
		var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
		xmlDoc.async=true;
		xmlDoc.onreadystatechange = function() {
			if (xmlDoc.readyState == 4)
			{
				if(xmlDoc.parseError.errorCode != 0)
				{

				}
				else
				{
					var result = new MSNSearchResult();
					var nodes = xmlDoc.documentElement.childNodes;
					result.Count = nodes.length;
					result.makeItem(result.Count);
					for (var i = 0; i < result.Count; i++)
					{
						var node = nodes[i];
						var item = result.item(i);
						item.LocationCode = node.getAttribute("weatherlocationcode");
						item.ZipCode = node.getAttribute("zipcode");
						item.Location = node.getAttribute("weatherlocationname");
						item.Fullname = node.getAttribute("weatherfullname");
						item.SearchDistance = node.getAttribute("searchdistance");
						item.SearchScore = node.getAttribute("searchscore");
						item.SearchLocation = node.getAttribute("searchlocation");
					}
					result.RetCode = 200;
					self.OnDataReady(result);
				}
			}
		};
		xmlDoc.load("http://weather.service.msn.com/find.aspx?outputview=search&src=vista&weasearchstr="+convert(loc));
	},
	OnDataReady:function(data){}
}

var MicrosoftGadget  = new Object();
		
////////////////////////////////////////////////////////////////////////////////
//
// setup() - triggered by body.onload event
//
////////////////////////////////////////////////////////////////////////////////
function setup() 
{
  // If we are in BIDI Mode, apply some special css 
  // to help folks read things Right to Left
  if (gBIDIMode) 
  {
    document.body.className = 'BIDI'; 
  }

  // Fetch and place all of the localized strings
  document.getElementById('txtInputPlace').innerText  = gDefaultInputHelperString;
  document.getElementById('lblFahrenheit').innerHTML = getLocalizedString('Fahrenheit');
  document.getElementById('lblCelsius').innerHTML = getLocalizedString('Celsius');
  document.getElementById('lgdDisplayTemperatureIn').innerHTML = getLocalizedString('DisplayTemperatureIn');

  loadAndApplySettingsToPage();        

  // If we are in "Gadget Mode" then hook the OnSettingsClosing event 
  // (triggered when user clicks "OK" from the Settings Pane) to our 
  // custom "Save Settings" function
  if (gGadgetMode) 
  {    
    System.Gadget.onSettingsClosing  = function(event) 
    { 
      if (event.closeAction == event.Action.commit) 
      { 
        extractAndSaveSettingsFromPage(); 
      }
    }        
  }
  document.body.attachEvent('onclick', function() { showSearchStatus(false, false, ''); });
  doResetHelperText();
  document.getElementById('txtInputPlace').focus();
}
////////////////////////////////////////////////////////////////////////////////
//
// loadAndApplySettingsToPage() - Loads settings and applies them to page 
//
////////////////////////////////////////////////////////////////////////////////
function loadAndApplySettingsToPage() 
{
  // Load Settings

  var theWeatherLocation            = unescape(readSetting("WeatherLocation")) || getPersistentSettingInternal("WeatherLocation") || gDefaultWeatherLocation;
  var theWeatherLocationCode        = readSetting("WeatherLocationCode") || getPersistentSettingInternal("WeatherLocationCode") || gDefaultWeatherLocationCode;
  var theDisplayDegreesIn           = readSetting("DisplayDegreesIn")   || getPersistentSettingInternal("DisplayDegreesIn") || gDefaultDisplayDegreesIn;
  var theDockedSize                 = readSetting("DockedSize")   || gDefaultDockedSize;
  var theUnDockedSize               = readSetting("UnDockedSize")   || gDefaultUnDockedSize;

  // Apply Settings
  document.getElementById("PlaceTitle").innerHTML = getLocalizedString('CurrentCity');
  document.getElementById("PlaceCurrent").innerHTML = theWeatherLocation;
  document.getElementById("radio" + theDisplayDegreesIn).checked = "checked";
  document.getElementById('WeatherLocation').value = theWeatherLocation;
  document.getElementById('WeatherLocationCode').value = theWeatherLocationCode;
    
  // Create instance of MSNServices.dll and attach to our Global Object
  //var oMSN = new ActiveXObject("wlsrvc.WLServices");
  if (MicrosoftGadget.oMSN != null)
  {
  	MicrosoftGadget.oMSN.xmlDoc.abort();
  }
  MicrosoftGadget.oMSN = new MSNSearch(); //oMSN.GetService("weather"); 
  MicrosoftGadget.bPlacePossibilitiesDisplayed = false;
  MicrosoftGadget.bHaveSearched =false;
  MicrosoftGadget.buttonState = 'btnSearch';
  MicrosoftGadget.bInputBoxHasFocus=true; 
  MicrosoftGadget.spinner = new getSpinner( "PleaseWaitLoadingSpinner" );  
  MicrosoftGadget.spinner.hide();
}
////////////////////////////////////////////////////////////////////////////////
//
// extractAndSaveSettingsFromPage() - Extracts values from page and saves them
//
////////////////////////////////////////////////////////////////////////////////
function extractAndSaveSettingsFromPage() 
{
  // Extract Settings
  var theWeatherLocation         = document.getElementById('WeatherLocation').value;
  var theWeatherLocationCode     = document.getElementById('WeatherLocationCode').value.split('|')[0];
  var theDisplayDegreesIn        = "Fahrenheit";
  if (document.getElementById("radioCelsius").checked) 
  {
    theDisplayDegreesIn          = "Celsius";
  }
  
  // Save Settings
  saveSetting("WeatherLocation", theWeatherLocation);
  saveSetting("WeatherLocationCode", theWeatherLocationCode);
  saveSetting("DisplayDegreesIn", theDisplayDegreesIn); 
  saveSetting("DockedSize", "Small"); 
  saveSetting("UnDockedSize", "Tall");

  setPersistentSetting("WeatherLocation", theWeatherLocation);
  setPersistentSetting("WeatherLocationCode", theWeatherLocationCode);
  setPersistentSetting("DisplayDegreesIn", theDisplayDegreesIn); 
}
////////////////////////////////////////////////////////////////////////////////
//
// doSetHelperText() - sets input box to looks "Active" for further input
//
////////////////////////////////////////////////////////////////////////////////
function doSetHelperText() 
{
  if ( document.getElementById('txtInputPlace').value == gDefaultInputHelperString ) {
    document.getElementById('txtInputPlace').className = 'TextInputInactiveDefaultText';
  } 
  else 
  {
    document.getElementById('txtInputPlace').className = 'TextInputActive';
  }
}
////////////////////////////////////////////////////////////////////////////////
//
// doResetHelperText() - resets Helper text to default "Enter Location here" 
//                       and also resets the className of the input box
//
////////////////////////////////////////////////////////////////////////////////
function doResetHelperText() 
{
  var theInputElement = document.getElementById('txtInputPlace');

  if ( isEmpty() ) 
  {
    theInputElement.value = gDefaultInputHelperString;
    theInputElement.className = 'TextInputInactiveDefaultText';
    document.getElementById('btnSearchForPlace').className = 'btnSearch';
    if ( MicrosoftGadget.bInputBoxHasFocus ) 
    {
      setCaretPos( theInputElement, 0, 0 );
    }
  }	
}
////////////////////////////////////////////////////////////////////////////////
//
// doMouseOverSearchButton() - set mouseover image for Search Button
//
////////////////////////////////////////////////////////////////////////////////
function doMouseOverSearchButton() 
{
  var theClassName = 'btnClearOver';
  if ( MicrosoftGadget.buttonState=='btnSearch' ) 
  {
    theClassName = 'btnSearchOver'; 
  }
  document.getElementById('btnSearchForPlace').className = theClassName;  
}
////////////////////////////////////////////////////////////////////////////////
//
// doMouseOutSearchButton() - sets mouseout image for Search Button
//
////////////////////////////////////////////////////////////////////////////////
function doMouseOutSearchButton() 
{
  if (MicrosoftGadget.bInputBoxHasFocus == true) 
  {
    if ( MicrosoftGadget.buttonState=='btnSearch' )
    {
      document.getElementById('btnSearchForPlace').className = 'btnSearchInsertionPoint';
    }
    else
    {
      document.getElementById('btnSearchForPlace').className = 'btnClearInsertionPoint';
    }
  } 
  else 
  {
    if ( MicrosoftGadget.buttonState=='btnSearch' )
    {
      document.getElementById('btnSearchForPlace').className = 'btnSearch';
    }
    else
    {
      document.getElementById('btnSearchForPlace').className = 'btnClear';
    }
    
  }
}

////////////////////////////////////////////////////////////////////////////////
//
// doMouseDownSearchButton() - sets mousedown image for Search Button
//
////////////////////////////////////////////////////////////////////////////////
function doMouseDownSearchButton() 
{
  if ( MicrosoftGadget.buttonState=='btnSearch' )
  {
    document.getElementById('btnSearchForPlace').className = 'btnSearchDown';  
  }
  else
  {
    document.getElementById('btnSearchForPlace').className = 'btnClearDown';  
  }
}
////////////////////////////////////////////////////////////////////////////////
//
// doMouseUpSearchButton() - sets mouseup image for Search Button
//
////////////////////////////////////////////////////////////////////////////////
function doMouseUpSearchButton() 
{
  if (MicrosoftGadget.buttonState == 'btnSearch') 
  {
    doSearch();
  } 
  else if (MicrosoftGadget.buttonState == 'btnClear') 
  {
    var theInputElement = document.getElementById('txtInputPlace');
    theInputElement.value = '';
    doResetHelperText();
    showSearchStatus(false, false, '');
    MicrosoftGadget.buttonState='btnSearch';
  }
  
  if ( MicrosoftGadget.buttonState=='btnSearch' )
  {
    document.getElementById('btnSearchForPlace').className = 'btnSearchOver';   
  }
  else
  {
    document.getElementById('btnSearchForPlace').className = 'btnClearOver';   
  }
}
////////////////////////////////////////////////////////////////////////////////
//
// doFocusInputBox() - sets image for Search Button based on keyboard focus
//
////////////////////////////////////////////////////////////////////////////////
function doFocusInputBox() 
{
  MicrosoftGadget.bInputBoxHasFocus = true;
  setCaretPos( document.getElementById('txtInputPlace'), 0, 0 );
  if ( MicrosoftGadget.buttonState=='btnClear' ) 
  {
    document.getElementById('btnSearchForPlace').className = 'btnClearInsertionPoint';
  }
}
////////////////////////////////////////////////////////////////////////////////
//
// doBlurInputBox() - sets image for Search Button when mouse leaves input box
//
////////////////////////////////////////////////////////////////////////////////
function doBlurInputBox() 
{
  MicrosoftGadget.bInputBoxHasFocus = false; 
  if ( MicrosoftGadget.buttonState=='btnSearch' )
  {
    document.getElementById('btnSearchForPlace').className = 'btnSearch';
  }
  else
  {
    document.getElementById('btnSearchForPlace').className = 'btnClear';
  }
  doResetHelperText();  
}
////////////////////////////////////////////////////////////////////////////////
//
// isEmpty() - indicates whether a value has been entered into the search box
//
////////////////////////////////////////////////////////////////////////////////
function isEmpty() 
{
  var theInputElement = document.getElementById('txtInputPlace');
  return  ((theInputElement.value == '') || (theInputElement.value==gDefaultInputHelperString));
}
////////////////////////////////////////////////////////////////////////////////
//
// possiblyResetPlacePossibilities() - reset the PlacePossibilities DIV 
// if we have an error state or otherwise no meaningful data to display
//
////////////////////////////////////////////////////////////////////////////////
function possiblyResetPlacePossibilities() 
{
  if ((document.getElementById('txtInputPlace').value == gDefaultInputHelperString) || (document.getElementById('PlacePossibilities').innerHTML == getLocalizedString("LocationDontExist")) || (document.getElementById('PlacePossibilities').innerHTML == getLocalizedString("ServiceNotAvailable"))) 
  {
    showSearchStatus(false, false, '');
  }      
}
////////////////////////////////////////////////////////////////////////////////
//
// doBeginInput() - triggered when a user clicks in the input box.  
//                  Blanks out Helper text.  
//
////////////////////////////////////////////////////////////////////////////////
function doBeginInput() 
{
  var theInputElement = document.getElementById('txtInputPlace');

  possiblyResetPlacePossibilities();
  
  if (theInputElement.value == gDefaultInputHelperString) 
  {
    theInputElement.value = '';
    theInputElement.className = 'TextInputActive';
  }
  MicrosoftGadget.buttonState='btnSearch';
  document.getElementById('btnSearchForPlace').className = 'btnSearchInsertionPoint';
}
////////////////////////////////////////////////////////////////////////////////
//
// doSearch() - triggered when user clicks "Search" button
//
////////////////////////////////////////////////////////////////////////////////
function doSearch() 
{
  showSearchStatus(false, false, '');
  MicrosoftGadget.bHaveSearched = false;
  // Store original request for later use in disambiguating search results
  MicrosoftGadget.locationSearched = document.getElementById('txtInputPlace').value;  
  
  // If we have something meaningful to search for, go ahead...
  if ( !isEmpty() )
  {
    MicrosoftGadget.bHaveSearched = true;
    // Map event handler to refresh display(s) when fresh data received
    MicrosoftGadget.oMSN.OnDataReady = doDisplayPlacePossibilities;        
    showSearchStatus(true, true, getLocalizedString("Searching"));
    MicrosoftGadget.buttonState = 'btnClear';
    // Trigger Search by Location
    MicrosoftGadget.oMSN.SearchByLocation( MicrosoftGadget.locationSearched );                       
  } 
  else 
  {
    showSearchStatus(true, true, getLocalizedString('NoSearchQuery'));
    document.getElementById('txtInputPlace').focus();
  }
}
////////////////////////////////////////////////////////////////////////////////
//
// showSearchStatus(bool bVisible, bool bBorder, string sMessage) - 
//   bVisible == Show/Hide Search Status Box, 
//   bBorder == special state with borders around Status Box (for error states), 
//   sMessage == Message to display 
//   *Note that sending in default value of "Searching" for sMessage 
//         results in display of Spinner animation.
//
////////////////////////////////////////////////////////////////////////////////
function showSearchStatus(bVisible, bBorder, sMessage) 
{
  showOrHide('PlacePossibilities', bVisible);

  if (sMessage == getLocalizedString("Searching")) 
  { 
    MicrosoftGadget.spinner.show();
    MicrosoftGadget.spinner.start();
    sMessage = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + sMessage;
  } 
  else 
  {
    MicrosoftGadget.spinner.hide();
    MicrosoftGadget.spinner.stop();
  }
  
  document.getElementById('PlacePossibilities').innerHTML = sMessage;
  if(bVisible && bBorder && sMessage == '') 
  {
    document.getElementById('txtInputPlace').focus();
    document.getElementById('txtInputPlace').select();
  }

  if(bBorder) 
  {
    document.getElementById('PlacePossibilities').className = "border";
  } 
  else 
  {
    document.getElementById('PlacePossibilities').className = '';
  }
}
////////////////////////////////////////////////////////////////////////////////
//
// doDisplayPlacePossibilities(object data) - this is the callback function 
// triggered by the .DLL that will be called when we have data returned
//
////////////////////////////////////////////////////////////////////////////////
function doDisplayPlacePossibilities(data) 
{
  if (data.Count && (data.Count > 0)) 
  {
    showSearchStatus(true, false, '');

    if (data.Count > 1) 
    {
      var thePickList = '<select id="selectPlace" size="10" onclick="setSelectedPlace(this);" onkeydown="onKeyDown(event, this);">';      
      for (var i=0; i<data.Count; i++) 
      {
        var theDisambiguatedLocation = disambiguatedLocation( data.item(i), data.Count );
        thePickList += '  <option value="' + data.item(i).LocationCode + '|' + data.item(i).ZipCode + '"';
        if (i==0) 
        {
          thePickList += ' selected="selected"';
        }
        thePickList += ' title=\"' + theDisambiguatedLocation +'\">' + theDisambiguatedLocation + '</option>';
      }
      thePickList += '</select>';
      document.getElementById('PlacePossibilities').innerHTML = thePickList;

      // Set focus to the Picklist which now exists in the DOM
      setTimeout("if (document.getElementById('selectPlace')) { document.getElementById('selectPlace').focus(); }",150);
      MicrosoftGadget.bPlacePossibilitiesDisplayed = true;
    } 
    else 
    {  
      // We have an exact "hit", so auto-select it
      showOrHide('PlacePossibilities', false);

      var theWeatherLocationCode = data.item(0).LocationCode + '|' + data.item(0).ZipCode; 
      var theWeatherLocation = disambiguatedLocation( data.item(0), 1 );

      // Reset the "currently Selected Location" string
      document.getElementById("PlaceCurrent").innerText = theWeatherLocation;  
      // Reset Search Box value
      document.getElementById('txtInputPlace').value = '';  
      doResetHelperText();

      document.getElementById('WeatherLocation').value = theWeatherLocation;
      document.getElementById('WeatherLocationCode').value = theWeatherLocationCode;
      
      MicrosoftGadget.buttonState='btnSearch';    
      // Mimic Vista behavior of moving to next tabIndex element 
      document.getElementById('txtInputPlace').blur();
    }
  } 
  else 
  {
    showSearchStatus(true, true, '');
    if ( data.RetCode != 200 ) 
    {
      document.getElementById('PlacePossibilities').innerHTML = getLocalizedString("ServiceNotAvailable");
    } 
    else 
    {
      document.getElementById('PlacePossibilities').innerHTML = getLocalizedString("LocationDontExist");
    }
  }
}
////////////////////////////////////////////////////////////////////////////////
//
// disambiguatedLocation( obj oMSNWeatherLocation ) - returns an unambiguous 
// location when result does not obviously relate to search term. This happens
// when a weather observation point is at a distance (ie in a nearby city).
//
// Modifed by dyhan81
// 
////////////////////////////////////////////////////////////////////////////////
function disambiguatedLocation( oMSNWeatherLocation, theCount ) {
  var retVal = oMSNWeatherLocation.Location;
  var theLocationSearched = MicrosoftGadget.locationSearched.toLowerCase();
  var bShowDisambiguation = true;

  // Determine if we have an "Exact Match" (ie disambiguation NOT required)
  if  
  ( //  a) A Zip Code was entered in the search box and Location has matching
    ( theLocationSearched == oMSNWeatherLocation.ZipCode )  || 
    //  b) Location Fullname contains the exact string entered into search box
    ( oMSNWeatherLocation.Fullname.toLowerCase().indexOf( theLocationSearched ) > -1 ) ||
    //  c) Search Distance is "0"
    ( parseFloat( oMSNWeatherLocation.SearchDistance ) == 0 ) 
  )
  { 
    bShowDisambiguation = false; 
  }  
  if ( bShowDisambiguation ) 
  { 
    if (( parseFloat(oMSNWeatherLocation.SearchScore) > .94 ) && ( theCount==1 ))
    {
      // example (search=="Newcastle,wa"), return="Bryn Mawr, WA (closest location for Newcastle, King, Washington, United States)"
      retVal = toLocalizedString(oMSNWeatherLocation.Location) + ' (' + getLocalizedString('SearchNearbyDisambiguation') + ' ' + (toLocalizedString(oMSNWeatherLocation.SearchLocation)) + ')';
    }
    else
    {
      // example: search="mkul", return="Mukkul [Mukgul], South Chungcheong, South Korea (closest location: Boryeong, KOR)" 
      retVal = toLocalizedString(oMSNWeatherLocation.SearchLocation) + ' (' + getLocalizedString('SearchFuzzyDisambiguation') + ' ' + (toLocalizedString(oMSNWeatherLocation.Location)) + ')';
    }        
  }
  // an exact match was found. Return (full) weather location
  else
  { 
    if ( oMSNWeatherLocation.Fullname && (oMSNWeatherLocation.Fullname.length > 0) )
    {
      retVal = toLocalizedString(oMSNWeatherLocation.Fullname);
    }
  }
  return retVal;
}
////////////////////////////////////////////////////////////////////////////////
//
// onKeyDown(event, obj) - used by PlacePossibilities Select list 
//                         to handle keyboard navigation and selection
//
////////////////////////////////////////////////////////////////////////////////
function onKeyDown(event, obj) 
{
  if (event.keyCode==13) 
  { 
    // Enter 
    setSelectedPlace(obj); 
  } 
  else if (event.keyCode==27) 
  { 
    // escape
    showSearchStatus(false, false, '');
  }
}
////////////////////////////////////////////////////////////////////////////////
//
// textBoxSearch() - Monitors keypresses while typing in the Search box.
//
////////////////////////////////////////////////////////////////////////////////
function textBoxSearch() 
{
  doSetHelperText();
  doBeginInput();
  var retVal = true;
  if (event.keyCode==13) 
  {  
    // Enter Key 
    MicrosoftGadget.buttonState = 'btnSearch';
    doSearch();
    if ( MicrosoftGadget.buttonState=='btnSearch' )
    {
      document.getElementById('btnSearchForPlace').className = 'btnSearch';   
    }
    else
    {
      document.getElementById('btnSearchForPlace').className = 'btnClear';   
    }
    // Prevent this keyboard event from bubbling out of the HTML window 
    // the "ENTER" key has special meaning to SideBar
    retVal = false; 
  }
  
  if (event.keyCode == 27) 
  {  
    // Escape Key
    showSearchStatus(false, false, '');
    // "ESC" key has special meaning to SideBar, 
    // so prevent this event from bubbling out of the HTML window
    retVal = false; 
  }
  
  // Limit input to 125 characters
  var theInputString = document.getElementById('txtInputPlace');
  if ( theInputString.value.length>125 ) 
  {
    theInputString.value=theInputString.value.substring(0,125);
  }

  return retVal;
}
////////////////////////////////////////////////////////////////////////////////
//
// setSelectedPlace(oHTMLElement Select aPickList) -- extracts selected element
// from (programmatically generated) Select list.  
// Saves off these values to hidden form elements.
//
////////////////////////////////////////////////////////////////////////////////
function setSelectedPlace(aPickList) 
{
  if(aPickList.selectedIndex > -1) 
  {
    var theWeatherLocationCode = aPickList(aPickList.selectedIndex).value;
    var theWeatherLocation = aPickList(aPickList.selectedIndex).text;
    // Clear out old Select Statement
    document.getElementById('PlacePossibilities').innerHTML = "";     
    // Hide the PlacePossibilities Area
    showOrHide('PlacePossibilities', false);                          

    // Reset the "currently Selected Location" string
    document.getElementById("PlaceCurrent").innerText = theWeatherLocation;  
    // Reset Search Box value
    document.getElementById('txtInputPlace').value    = '';  
    doResetHelperText();

    // Set hidden form field values for later use when saving off values
    document.getElementById('WeatherLocation').value = theWeatherLocation;
    document.getElementById('WeatherLocationCode').value = theWeatherLocationCode;
    MicrosoftGadget.bPlacePossibilitiesDisplayed = false;
    MicrosoftGadget.buttonState = 'btnSearch';  
  }
}


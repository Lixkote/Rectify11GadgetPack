////////////////////////////////////////////////////////////////////////////////
//
// THIS CODE IS NOT APPROVED FOR USE IN/ON ANY OTHER UI ELEMENT OR PRODUCT COMPONENT.
// Copyright (c) 2009 Microsoft Corporation. All rights reserved.
//
////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
//
// GLOBAL VARIABLES
//
////////////////////////////////////////////////////////////////////////////////
var g_msFeedManagerProgID	= "Microsoft.FeedsManager";
var g_msFeedManager	= null;
var g_returnFeed	= null;
var g_viewElements	= null;
var g_noFeeds	= true;
var g_downloadErrorFlag	= false;
var g_feedNameLength;
var g_showInBrowser	= "";
var g_currentFeedPath	= "";
var g_currentFeedUrl	= "";
var g_totalViewableItems	= "";
var g_feedTitleCharLength	= 36;
var g_stringTitleLength	= 20;
var g_countToView	= 4;
var g_feedTotal	= 0;
var g_currentArrayIndex	= 0;
var g_timerMilliSecs	= 10000;
var g_loadingMilliSecs	= 10000;
var g_lastCalledArrayIndex; 
var g_lastClickedUrl;
var g_feedURL;
var g_feedTitle;
var g_feedForFlyout;
var g_gadgetErrorFlag;
var g_timer;
var g_timerFlag;
var g_drawerTimer;
var g_alphaInTimer;
var g_loadFirstTime;
var g_feedClicked;
var g_feedLocalID;
var g_timerFlyoutFlag;
var g_getFeedTimer;
var g_interGetFeedInterval	= 30000;	// interval between getfeed calls (30 seconds)
var g_interGetFeedIntervalOnFirstLoad	= 5000;	// interval between getfeed calls (first load-> 5 seconds)
var g_currentInterGetfeedInterval;
var g_totalFeedCount;
var g_totalFeedItemCount;
var g_totalEmptyFeedCount;
var g_tempReturnFeed	= null;
var g_feedPaths;
var g_feedsCurrentlySelected;
var g_currentFeedData;
var g_feedDownloadTimes;
var g_currentFeedItemIndex;
var fFirstTime;
var fInProgress;
var fNewDataReady;
var fSomethingToDo; // atleast one feed was queued for refresh

////////////////////////////////////////////////////////////////////////////////
//
// CONSTANTS
//
////////////////////////////////////////////////////////////////////////////////
var ZERO_TIMESTAMP_MILLISECONDS = new Date(1899,11,30).getTime();	// MSDN documentation for IFeedItem::PubDate (http://msdn.microsoft.com/en-us/library/ms685800(VS.85).aspx)
									// The interface returns 0 if pubdate is not specified in source and this constant represents the representative date for value 0 as per the above documentation

////////////////////////////////////////////////////////////////////////////////
//
// System - Object Model settings
//
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//
// SETTINGS
//
////////////////////////////////////////////////////////////////////////////////
function loadSettings()
{
	var tempSettings = new getRssSettings();
	g_currentFeedPath = tempSettings.rssFeedPath;
	g_currentFeedUrl = tempSettings.rssFeedUrl;
	g_totalViewableItems = tempSettings.rssFeedCount;
	g_loadFirstTime = tempSettings.loadFirstTime;
	stopPolling();
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function createFeedDropDown()
{ 
	loadMSFeedManager(); 
	AddFeedToDropDown(L_TITLEFORDROP_TEXT,"defaultGadg");
	getFeedsFolders(g_msFeedManager.RootFolder);
	g_msFeedManager = null;
	for(var i = 0; i < L_ARTICLES_TEXT.length; i++)
	{
		rssTotalsSelection.options[i]=new Option(L_ARTICLES_TEXT[i], articleArray[i]);
		rssTotalsSelection.options[i].title = L_ARTICLES_TEXT[i];
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function getFeedsFolders(folderToAdd)
{
	var currentFolder;
	var currentFeeds;
	try
	{
		if (folderToAdd.IsRoot)
		{
			currentFeeds = folderToAdd.Feeds;
			for (var feedIndex = 0; feedIndex < currentFeeds.Count; feedIndex++)
			{
				AddFeedToDropDown(currentFeeds.Item(feedIndex).Name, currentFeeds.Item(feedIndex).Url);
			}
			getFeedsFolders(folderToAdd.SubFolders);
			return;
		}
		for (var folderIndex = 0; folderIndex < folderToAdd.Count; folderIndex++)
		{
			currentFolder = folderToAdd.Item(folderIndex);
			currentFeeds = currentFolder.Feeds;
			AddFeedToDropDown(currentFolder.Path, currentFolder.Path);
			for (var feedIndex = 0; feedIndex < currentFeeds.Count; feedIndex++)
			{
				AddFeedToDropDown(currentFeeds.Item(feedIndex).Path, currentFeeds.Item(feedIndex).Url);
			}
			if (currentFolder.Subfolders.Count > 0)
			{
				getFeedsFolders(currentFolder.Subfolders);
			}
		}
	}
	catch(e)
	{
		return;
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function AddFeedToDropDown(_feedText, _feedValue)
{
	var tempChckSettings = new getRssSettings();
	var objEntry = document.createElement("option");
	objEntry.text = _feedText;
	objEntry.value = _feedValue; 
	objEntry.title = _feedText;
	if(_feedText == tempChckSettings.rssFeedPath)
	{
		objEntry.selected = true;
	}
	rssFeedSelection.add(objEntry);
}
////////////////////////////////////////////////////////////////////////////////
//
// GADGET
//
////////////////////////////////////////////////////////////////////////////////
function viewElementsObject()
{
	this.FeedItems = new Array();
	this.FeedTitleLink = document.getElementById("FeedTitleLink");
	this.FeedTitleCount = document.getElementById("FeedTitleCount");
	for(var i = 0; i < 4; i++)
	{
		var newElement = document.getElementById("FeedItemLink" + i);
		newElement.onfocusin = newElement.onmouseover;
		newElement.onfocusout = newElement.onmouseout;
		newElement.hideFocus = true;
		this.FeedItems.push(newElement);
	}
}
////////////////////////////////////////////////////////////////////////////////
//
// set's alt tabs for navigation;
//
////////////////////////////////////////////////////////////////////////////////
function setAltLabels()
{	
	buttonRightNarrator.alt = buttonRightNarrator.title = L_SHOWNEXT_TEXT;
	buttonLeftNarrator.alt = buttonLeftNarrator.title = L_SHOWPREV_TEXT;
}
////////////////////////////////////////////////////////////////////////////////
//
// Clear HTML elements from ViewElements Object
//
////////////////////////////////////////////////////////////////////////////////
function clearViewElements()
{
	positionNumbers.innerText = "";
	for(i=0; i < 4; i++)
	{
		if ( g_viewElements !== null )
		{
			g_viewElements.FeedItems[i].innerHTML = "";
			g_viewElements.FeedItems[i].href = "";
			g_viewElements.FeedItems[i].innerText = "";
			g_viewElements.FeedItems[i].setAttribute("name", "");
			g_viewElements.FeedItems[i].setAttribute("localId", "");
		}

		eval("FeedItemName"+i).innerHTML = "";
		eval("FeedItemName"+i).style.backgroundColor = "";
		eval("FeedItemName"+i).innerText = "";
		eval("FeedItemName"+i).setAttribute("title","");

		eval("FeedItemDate"+i).innerHTML = "";
		eval("FeedItemDate"+i).style.backgroundColor = "";
		eval("FeedItemDate"+i).innerText = "";
		eval("FeedItemDate"+i).setAttribute("title","");

		eval("FeedItemLink"+i).style.textOverflow = "";
		eval("FeedItemLink"+i).style.overflow = ""; 
		eval("FeedItemLink"+i).style.whiteSpace = "";
		eval("FeedItemLink"+i).style.width = "0px";
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function startTimer()
{
	if(g_timerFlag)
	{
		stopTimer();
		g_timer = setInterval(setNextViewItems, g_timerMilliSecs);
	}
 }
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function stopTimer()
{
	if(g_timerFlag)
	{
		clearInterval(g_timer);
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function startPolling()
{
	stopPolling();
	System.Debug.outputString("Start Polling : Pull feeds queued up in bursts"); //DEBUG CODE
	g_getFeedTimer = setInterval(getDataForNextFeed, g_currentInterGetFeedInterval);
 }
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function stopPolling()
{
	if (g_getFeedTimer!==undefined)
	{
		System.Debug.outputString("Stop Polling : Stop pull of queued feeds"); //DEBUG CODE
		clearInterval(g_getFeedTimer);
	}
}

////////////////////////////////////////////////////////////////////////////////
// get feed data, put in array, update lastwritetime
// return value: no of feed items pulled for current feed
////////////////////////////////////////////////////////////////////////////////
function getItemsForQueuedFeed(currentFeedPathIndex)
{
	var itemsInCurrentFeed=0;
	System.Debug.outputString("Pulling data. GETFEED: "+g_feedPaths[currentFeedPathIndex].Path); //DEBUG CODE
	var feedToDownload = safeGetFeed(g_feedPaths[currentFeedPathIndex].Path);
	g_tempReturnFeed = null;
	g_tempReturnFeed = new makeFeed("","","");

	if (feedToDownload.Items.Count > 0)
	{
		for (var i = 0; i < feedToDownload.Items.Count; i++)
		{
			var currentFeedItem = feedToDownload.Items.item(i);
			var tempFeedTitle = removeNewLines(currentFeedItem.Title);
			if (tempFeedTitle != "")
			{
				var tempFeedLink	= currentFeedItem.Link;
				var tempFeedIsRead	= currentFeedItem.IsRead;
				var tempFeedItemID	= currentFeedItem.LocalId;
				var tempFeedItemParent	= feedToDownload.name;
				var tempFeedItemParentPath	= feedToDownload.path;
				var tempFeedItemDate	= currentFeedItem.PubDate;
				if ( ZERO_TIMESTAMP_MILLISECONDS == (new Date(tempFeedItemDate)).getTime() )
				{
					tempFeedItemDate = currentFeedItem.Modified;
				}

				var tempFeedItem	= new feedItem(
													tempFeedTitle, 
													tempFeedLink, 
													tempFeedIsRead, 
													tempFeedItemID, 
													tempFeedItemParent,
													tempFeedItemParentPath,
													tempFeedItemDate
												);
				g_tempReturnFeed.feedItems.push(tempFeedItem);
			}
		}
		g_totalFeedItemCount = g_totalFeedItemCount + feedToDownload.UnreadItemCount;
		itemsInCurrentFeed = feedToDownload.ItemCount;
		g_currentFeedData[g_feedPaths[currentFeedPathIndex].GUID] = g_tempReturnFeed;
	}
	else
	{
		g_totalEmptyFeedCount = g_totalEmptyFeedCount + 1;
	}

	g_feedDownloadTimes[g_feedPaths[currentFeedPathIndex].GUID] = (new Date(feedToDownload.LastWriteTime)).toUTCString();
	feedToDownload = null;
	
	return itemsInCurrentFeed;
}

////////////////////////////////////////////////////////////////////////////////
// at end of reading feeds in bursts, aggregate all data to the temporary
// feed item holder. It will be copied to the main array in the next refresh
////////////////////////////////////////////////////////////////////////////////
function aggregateAllItemsToTempArray()
{
		System.Debug.outputString("Data read cycle complete. Copying New data to temporary array."); //DEBUG CODE
		stopPolling();
		fNewDataReady = true; // new data is ready and present in g_tempReturnFeed (to be cleared when data is copied)
		fInProgress = false;
		fSomethingToDo = false;
		g_currentFeedItemIndex = -1;

		//concatenate all feeditems , then sort and reverse and assign to the original array
		g_tempReturnFeed = null;
		g_tempReturnFeed = new makeFeed("","","");
		for (var i in g_currentFeedData)
		{
			if ( g_currentFeedData[i] !== undefined && g_currentFeedData[i] !== null )
			{
				g_tempReturnFeed.feedItems=g_tempReturnFeed.feedItems.concat(g_currentFeedData[i].feedItems);
			}
		}
		g_tempReturnFeed.feedItems.sort(sortDates);
		g_tempReturnFeed.feedItems.reverse();
		g_tempReturnFeed.feedCount = '&nbsp;(<b>'+g_totalFeedItemCount+'</b>)&nbsp;';
		g_tempReturnFeed.feedUrl = ''; 

		if ( g_tempReturnFeed.feedItems.length == 0 )
		{
			displayMessage(L_RRFD_ERRORMESSAGE, true);
		}
}

////////////////////////////////////////////////////////////////////////////////
// get feed data, put in array, update lastwritetime
// return value: no of feed items pulled for current feed (-1 if no feed was pulled)
////////////////////////////////////////////////////////////////////////////////
function getDataForNextFeed()
{
	loadMSFeedManager();
	var itemsInCurrentFeed;
	var currentFeedPathIndex = g_currentFeedItemIndex + 1;
	g_currentFeedItemIndex = g_currentFeedItemIndex + 1;

	if (currentFeedPathIndex >= g_feedPaths.length) // DATA READ IS COMPLETE
	{
		aggregateAllItemsToTempArray();
		return -1; // indicating no data was pulled in this run
	}

	itemsInCurrentFeed=getItemsForQueuedFeed(currentFeedPathIndex);

	if (fFirstTime && itemsInCurrentFeed>0)
	{
		System.Debug.outputString("Set first feed data for Viewing and continue to pull other feeds in burst mode"); //DEBUG CODE
		g_tempReturnFeed.feedItems.sort(sortDates);
		g_tempReturnFeed.feedItems.reverse();
		g_returnFeed = g_tempReturnFeed;
		setNextViewItems();
		fFirstTime = false;
	}
	
	g_msFeedManager = null;
	g_tempReturnFeed = null;
	
	return itemsInCurrentFeed;
}

////////////////////////////////////////////////////////////////////////////////
//
// create New FeedItem Object which gets pushed into MakeFeed.FeedItems
//
////////////////////////////////////////////////////////////////////////////////
function feedItem(_feedItemName, _feedItemUrl, _feedItemIsRead, _feedItemID, _feedItemParent, _feedItemParentPath, _feedItemDate)
{	
	this.feedItemDate	= _feedItemDate;
	this.feedItemName	= _feedItemName;
	this.feedItemUrl	= _feedItemUrl;
	this.feedItemIsRead	= _feedItemIsRead;
	this.feedItemID	= _feedItemID;
	this.feedItemParent	= _feedItemParent;
	this.feedItemParentPath = _feedItemParentPath;
}
////////////////////////////////////////////////////////////////////////////////
//
// create New MakeFeed Object
//
////////////////////////////////////////////////////////////////////////////////
function makeFeed(_feedName, _feedUrl, _feedCount)
{
	this.feedItems	= new Array();
	this.feedName	= _feedName;
	this.feedUrl	= _feedUrl;
	this.feedCount	= _feedCount;
}
////////////////////////////////////////////////////////////////////////////////
//
// determine if gadget is visible
//
////////////////////////////////////////////////////////////////////////////////
function checkVisibility()
{
	isVisible = System.Gadget.visible;
	if (!isVisible)
	{
		stopTimer();
	}
	if(isVisible)
	{
		startTimer();
	}
}
////////////////////////////////////////////////////////////////////////////////
//
// Gadget specific settings
// determine if gadget is in sidebar - docked or on the desktop - undocked
//
////////////////////////////////////////////////////////////////////////////////
function checkStateLite()
{
	if(!System.Gadget.docked) 
	{
		g_curLinkWidth = "250px"; 
		with(document.body.style)
		{ 
			height = "232px";
			width = "296px";
		}
		with(rssfeedBg.style)
		{
			height = "232px";
			width = "296px";
		} 
		rssfeedBg.src = "url(images/rssBackBlue_undocked.png)";
        background_.src = "images/rssBackBlue_undocked_.png";
	} 
	else if (System.Gadget.docked)
	{
		g_curLinkWidth = "113px"; 
		with(document.body.style)
		{
			height = "173px";
			width = "130px";
		}
		with(rssfeedBg.style)
		{
			height = "173px";
			width = "130px";
		} 
		rssfeedBg.src = "url(images/rssBackBlue_docked.png)";
        background_.src = "images/rssBackBlue_docked_.png";
	}
}

////////////////////////////////////////////////////////////////////////////////
//
// Gadget specific settings
// determine if gadget is in sidebar - docked or on the desktop - undocked
//
////////////////////////////////////////////////////////////////////////////////
function checkState()
{
	if(!System.Gadget.docked) 
	{
		undockedState();
	} 
	else if (System.Gadget.docked)
	{
		dockedState(); 
	}
}
////////////////////////////////////////////////////////////////////////////////
//
// Gadget specific settings
// determine if gadget is in sidebar - docked or on the desktop - undocked
//
////////////////////////////////////////////////////////////////////////////////
function checkFlyforTimer()
{
	if(!System.Gadget.Flyout.show)
	{
		startTimer();	
	}
}


////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function loadMain()
{
	// Check direction
	var pageDir = document.getElementsByTagName("html")[0].dir;
	
	if (pageDir == "rtl")
	{
		buttonLeftNarrator.style.right = "5px";
		buttonRightNarrator.style.left = "-1px";
	}
	else
	{
		buttonLeftNarrator.style.left = "2px";
		buttonRightNarrator.style.right = "2px";
	}
	
	fFirstTime = true;
	fInProgress = false;
	fNewDataReady = false;
	fSomethingToDo = false;
	g_feedPaths = new Array();
	g_feedsCurrentlySelected = new Array();
	g_currentFeedData = new Array();
	g_feedDownloadTimes = new Array();
	g_currentInterGetFeedInterval = g_interGetFeedIntervalOnFirstLoad;
	g_totalFeedCount = 0;
	g_totalFeedItemCount = 0;
	g_totalEmptyFeedCount = 0;
	g_currentFeedItemIndex = -1;
	g_returnFeed = null;
	clearViewElements();
	clearBorder();
	
	g_gadgetErrorFlag = 0;

	loadSettings();
	g_viewElements = new viewElementsObject();
	g_currentArrayIndex = 0; 
	setAltLabels();

	System.Gadget.visibilityChanged = checkVisibility;
	System.Gadget.Flyout.file = "flyout.html";
	System.Gadget.onShowSettings = loadSettings;	

	checkStateLite();
	showSpinner('35%');

	setTimeout(loadData, 1000);
	document.body.focus();
}
////////////////////////////////////////////////////////////////////////////////
//
// GADGET FUNCTIONS
//
////////////////////////////////////////////////////////////////////////////////
function loadData()
{			
	refreshRssFeedData();
	checkState();
	checkFlyforTimer();
	System.Gadget.onUndock = checkState;
	System.Gadget.onDock = checkState;
}
////////////////////////////////////////////////////////////////////////////////
//
// Check Path Get path
//
////////////////////////////////////////////////////////////////////////////////
function refreshRssFeedData()
{
	loadMSFeedManager();
	if(g_loadFirstTime == "defaultGadget" && g_msFeedManager.BackgroundSyncStatus == 0 )
	{
		g_msFeedManager = null;
		displayMessage(L_FCE_ERRORMESSAGE, false); 
		g_timerFlag = false;
	}
	else
	{
		g_msFeedManager = null;
		if ( fNewDataReady && !fInProgress )	// if all feeds queued up last time have been pulled, point data pointers correctly
		{
			System.Debug.outputString("Data available. Copying new data main array."); //DEBUG CODE
			g_returnFeed = g_tempReturnFeed;
			g_tempReturnFeed = null;
			fNewDataReady = false;

		}

		if ( fInProgress )	// if feeds queued up last time are being pulled, return doing nothing
		{
			return;
		}
		else	// queue up feeds for pulling and then trigger pull of first feed
		{
			System.Debug.outputString("Queue up feeds (that changed at publisher) for pull in this data refresh."); //DEBUG CODE
			loadMSFeedManager();
			g_feedTotal = 0;
			countFeeds(g_msFeedManager.RootFolder);

			if (g_feedTotal > 0)
			{
				fInProgress = true;
				if (!fFirstTime)
				{
					g_currentInterGetFeedInterval = g_interGetFeedInterval;
				}

				g_feedPaths = null;
				g_feedsCurrentlySelected = null;
				g_feedPaths = new Array();
				g_feedsCurrentlySelected = new Array();

				g_totalFeedCount = 0;
				g_totalFeedItemCount = 0;
				g_totalEmptyFeedCount = 0;
				g_currentFeedItemIndex = -1;

				if (g_currentFeedPath == "" || g_msFeedManager.ExistsFolder(g_currentFeedPath))
				{
					queueRssByFolder(g_currentFeedPath);
					checkForFeedStoreChanges();
				}
				else
				{
					if (g_msFeedManager.ExistsFeed(g_currentFeedPath))
					{
						queueRssByFeed(g_currentFeedPath);
					}
					else	// parameter not valid / not present in feed store
					{
						displayMessage(L_SI_ERRORMESSAGE, true);
						g_timerFlag = false;
						g_msFeedManager = null;
						g_returnFeed = null;
						return null;
					}
				}
			}
			else	// total number of feeds in common store = 0
			{
				displayMessage(L_ZF_ERRORMESSAGE, true);
			}
			g_msFeedManager = null;
			
			if (fSomethingToDo)
			{
				System.Debug.outputString("One or more changed feeds were queued for refresh."); //DEBUG CODE
				g_timerFlag = true;
				if (fFirstTime)
				{
					getDataForNextFeed(); // this may not return items in which case there is no data to display
				}				
				startPolling();
			}
			else
			{
				System.Debug.outputString("None of the feeds changed at the publisher since last refresh - No feeds were queued for pull."); //DEBUG CODE
				fInProgress = false;
			}
		}
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function sortDates(a,b)
{
	return(b.feedItemDate<a.feedItemDate)-(a.feedItemDate<b.feedItemDate);
}
////////////////////////////////////////////////////////////////////////////////
//	
// Load feed from FeedManager
//
////////////////////////////////////////////////////////////////////////////////
function loadMSFeedManager()
{		
	// Make sure we have a handle to the feed manager
	if (g_msFeedManager == null)
	{
		try
		{
			g_msFeedManager = new ActiveXObject(g_msFeedManagerProgID);
			if (g_msFeedManager == null)
			{
				displayMessage(L_MS_ERRORMESSAGE, false);
				g_timerFlag = false;
				return null;
			}
		}
		catch(e)
		{
			displayMessage(L_MS_ERRORMESSAGE, false); 
			g_timerFlag = false;
		}
	}	
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function countFeeds(folderToCheck)
{	
	g_feedTotal = g_feedTotal + folderToCheck.Feeds.Count;
	for(var i=1;i<=folderToCheck.Subfolders.Count;i++)
	{
	countFeeds(folderToCheck.Subfolders.Item(i-1)); 
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function getFirstFeed(folderToCheck)
{
	if(folderToCheck.Feeds.Count > 0)
	{
		for(var i=0;i<folderToCheck.Feeds.Count;i++)
		{
		if(g_msFeedManager.ExistsFeed(folderToCheck.Feeds.Item(i).path))
		{
				g_currentFeedPath = folderToCheck.Feeds.Item(i).path;
				return null;
		}
		}
	}
	for(var i=1;i<=folderToCheck.Subfolders.Count;i++)
	{
	if(g_currentFeedPath != "")
	{
			return null;
	}
	getFirstFeed(folderToCheck.Subfolders.Item(i-1));
	}
}

////////////////////////////////////////////////////////////////////////////////
//
// Bug #1779555: NULL Bstr can cause MS Feed manager crash because it doesn't
//				accept NULL BSTR. Feed team won't change in their code. So we 
//				have to make sure no NULL BSTR passed into GetFeed().
//			
// !!! Always call safeGetFeed, NOT g_msFeedManager.GetFeed() !!!
//
////////////////////////////////////////////////////////////////////////////////
function safeGetFeed(Path)
{
	if (Path == null || Path.Length == 0)
	{
		return g_msFeedManager.GetFeed("");
	}
	else
	{
		try
		{
			return g_msFeedManager.GetFeed(Path);
		}
		catch(e)
		{
			return g_msFeedManager.GetFeed("");
		}
	}
}
/////////////////////////////////////////////////////////////////////////////////
//
// Bug #94567: [TP34 Regression] RSS Feed-Headlines-
// If title attributes contain a new line they are no longer displayed correctly.
//
/////////////////////////////////////////////////////////////////////////////////
function removeNewLines(stringWithNewlines)
{
	var regEx; 

	regEx = new RegExp ('\r', 'gi') ;
	stringWithNewlines = stringWithNewlines.replace(regEx," ");
	regEx = new RegExp ('\n', 'gi') ;
	stringWithNewlines = stringWithNewlines.replace(regEx," ");
	regEx = new RegExp ('\t', 'gi') ;
	stringWithNewlines = stringWithNewlines.replace(regEx," ");

	while(stringWithNewlines.indexOf("  ")>=0)
	{
		regEx = new RegExp ('  ', 'gi') ;
		stringWithNewlines = stringWithNewlines.replace(regEx," ");
	}
	return stringWithNewlines;
}
////////////////////////////////////////////////////////////////////////////////
//
// create New Feed Path Object
//
////////////////////////////////////////////////////////////////////////////////
function makeFeedPath(_feedPath, _feedGUID)
{
	this.Path = _feedPath;
	this.GUID = _feedGUID;
}

////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function queueRssByFolder(Path)
{
	var folder = g_msFeedManager.GetFolder(Path);

	for(var subfolderIndex=0; subfolderIndex < folder.Subfolders.Count; subfolderIndex++)
	{
		queueRssByFolder(folder.Subfolders.Item(subfolderIndex).Path);
	}
	
	for (var folderIndex = 0; folderIndex < folder.Feeds.Count; folderIndex++)
	{
		var currentFeed = folder.Feeds.item(folderIndex);
		var currentFeedLastWriteTime = (new Date(currentFeed.LastWriteTime)).toUTCString();
		var currentFeedGUID = currentFeed.LocalId;
		var currentFeedPath = currentFeed.Path;

		if ( g_feedDownloadTimes[currentFeedGUID]==undefined || g_feedDownloadTimes[currentFeedGUID] !== currentFeedLastWriteTime )
		{
			var tempFeedPath = new makeFeedPath(currentFeedPath,currentFeedGUID);
			g_feedPaths.push(tempFeedPath);
			fSomethingToDo = true;
			System.Debug.outputString("Queueing feed: "+currentFeedPath); //DEBUG CODE
		}
		g_feedsCurrentlySelected[currentFeedGUID] = currentFeedPath;	// hash-store the GUID,path key-value pair
		g_totalFeedCount ++;

		tempFeedPath = null;
	}
}

////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function checkForFeedStoreChanges()
{
	var bRefreshMainArray = false;
	// Queueing done. Now check if any of the feed's data in feed data container must be removed (ie feed no longer exists in chosen folder)
	for (var tmpFeedGUID in g_currentFeedData)
	{
		if ( g_currentFeedData[tmpFeedGUID] !== null && (g_feedsCurrentlySelected[tmpFeedGUID] == undefined || g_feedsCurrentlySelected[tmpFeedGUID] == null) ) // Data for feed Not already deleted, and feed doesnt exist in folder currently selected
		{
			g_currentFeedData[tmpFeedGUID] = null;
			bRefreshMainArray = true;
		}
	}

	if ( bRefreshMainArray )
	{
		g_returnFeed = null;
		g_returnFeed = new makeFeed("","","");
		for (var i in g_currentFeedData)
		{
			if ( g_currentFeedData[i] !== undefined && g_currentFeedData[i] !== null )
			{
				g_returnFeed.feedItems=g_returnFeed.feedItems.concat(g_currentFeedData[i].feedItems);
			}
		}
		g_returnFeed.feedItems.sort(sortDates);
		g_returnFeed.feedItems.reverse();
		g_returnFeed.feedCount = '&nbsp;(<b>'+g_totalFeedItemCount+'</b>)&nbsp;';
		g_returnFeed.feedUrl = ''; 

		if ( g_returnFeed.feedItems.length == 0 )
		{
			g_returnFeed = null;
			displayMessage(L_RRFD_ERRORMESSAGE, true);
		}
	}

	if ( g_totalFeedCount == 0 )
	{
		displayMessage(L_ZF_ERRORMESSAGE, true);
	}
	g_feedsCurrentlySelected = null;
}


////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function queueRssByFeed(Path)
{
	var folderPath = Path.substring(0,Path.lastIndexOf("\\"));
	var folder = g_msFeedManager.GetFolder(folderPath);

	for (var folderIndex = 0; folderIndex < folder.Feeds.Count; folderIndex++)
	{
		var currentFeed = folder.Feeds.item(folderIndex);
		if (currentFeed.Path !== Path )
			continue;
		var currentFeedLastWriteTime = (new Date(currentFeed.LastWriteTime)).toUTCString();
		var currentFeedGUID = currentFeed.LocalId;
		var currentFeedPath = currentFeed.Path;
		if ( g_feedDownloadTimes[currentFeedGUID]==undefined || g_feedDownloadTimes[currentFeedGUID] !== currentFeedLastWriteTime )
		{
			var tempFeedPath = new makeFeedPath(currentFeedPath,currentFeedGUID);
			g_feedPaths.push(tempFeedPath);
			fSomethingToDo = true;
			System.Debug.outputString("Queueing feed: "+currentFeedPath); //DEBUG CODE
		}
		g_totalFeedCount = 1;
		return; // we found the feed we were looking for, no need to query remaining feeds
	}
}


////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function setPreviousViewItems()
{
	g_currentArrayIndex = g_currentArrayIndex - (g_countToView * 2);
	setNextViewItems();
}
////////////////////////////////////////////////////////////////////////////////
//
// Validate the URL starts with a valid prefix
//
////////////////////////////////////////////////////////////////////////////////
function checkHref(sURL)
{
	var safeURL = "";
	var prefixIndex = sURL.search("http://");
	if(prefixIndex == 0)
	{
		return sURL;
	}
	prefixIndex = sURL.search("https://");
	if(prefixIndex == 0)
	{
		return sURL;
	}
	prefixIndex = sURL.search("ftp://");
	if(prefixIndex == 0)
	{
		return sURL;
	}
	return safeURL;
}


////////////////////////////////////////////////////////////////////////////////
//
// Show Hide UI Element Blocks
//
////////////////////////////////////////////////////////////////////////////////
function showHideUIElementBlocks( bShowNavigationHolder, bShowFeedItemsHolder, bShowErrorMessageHolder)
{
	if( bShowNavigationHolder !== undefined && bShowNavigationHolder !== null )
	{
		if( bShowNavigationHolder )
			navHolder.style.visibility = "visible";
		else
			navHolder.style.visibility = "hidden";
	}

	if( bShowFeedItemsHolder !== undefined && bShowFeedItemsHolder !== null )
	{
		if( bShowFeedItemsHolder )
		{
			FeedItemHldr.style.visibility = "visible";
			FeedItemHldr.style.display = "inline";
		}
		else
		{
			FeedItemHldr.style.visibility = "hidden";
			FeedItemHldr.style.display = "none";
		}
	}

	if( bShowErrorMessageHolder !== undefined && bShowErrorMessageHolder !== null )
	{
		if( bShowErrorMessageHolder )
			errorTextHldr.style.visibility = "visible";
		else
			errorTextHldr.style.visibility = "hidden";
	}
}


////////////////////////////////////////////////////////////////////////////////
//
// Show Feed items that have content, hide the rest
//
////////////////////////////////////////////////////////////////////////////////
function showHideFeedItems(headlineCount, itemsInView)
{
	var countDiff = headlineCount % itemsInView;

	if( countDiff == 0 )
	{
		countDiff = itemsInView;
	}
	for(var i = 0; i < itemsInView; i++)
	{
		if( i < countDiff )
		{
			eval("FeedItem"+i).style.visibility = "visible";
		}
		else
		{
			eval("FeedItem"+i).style.visibility = "hidden";
		}
	}
}

////////////////////////////////////////////////////////////////////////////////
//
// Add Feed Items to View Elements HTML Object to be displayed in Gadget
//
////////////////////////////////////////////////////////////////////////////////
function setNextViewItems()
{
	if( g_timerFlag && g_returnFeed!==null )
	{
		var headlineCount;
		do
		{
			headlineCount = g_returnFeed.feedItems.length;
			g_lastCalledArrayIndex = g_currentArrayIndex;
			if(g_totalViewableItems < headlineCount)
			{
				headlineCount = g_totalViewableItems;
			}
			if(g_currentArrayIndex > g_returnFeed.feedItems.length || g_currentArrayIndex >= headlineCount)
			{ 
				g_currentArrayIndex = 0;
				refreshRssFeedData();
			} 

			var countDiff = headlineCount%g_countToView;
			var lastPageItemsArrayIndex;
			if(countDiff == 0)
			{ 
				lastPageItemsArrayIndex = headlineCount - g_countToView;
			}
			else
			{
				lastPageItemsArrayIndex = headlineCount - countDiff;
			}

			if(g_currentArrayIndex < 0 || g_currentArrayIndex >= lastPageItemsArrayIndex )
			{
				g_currentArrayIndex = lastPageItemsArrayIndex;
				refreshRssFeedData();
				showHideFeedItems(headlineCount , g_countToView);
			} 
			else
			{ 
				showHideFeedItems(g_countToView , g_countToView);// Show all items if not on last page
			} 

			if ( g_returnFeed == null )
			{
				return;
			}

		}
		while (headlineCount > g_returnFeed.feedItems.length);

		if ( headlineCount == 0 )
		{
			displayMessage(L_RRFD_ERRORMESSAGE, true);
			return;
		}

		if( !g_timerFlag )
			return;

		showHideUIElementBlocks( true, true, false);

		clearViewElements();

		System.Gadget.settingsUI = "settings.html";
		for(var i = 0; i < g_countToView; i++)
		{
			var positionContentArray = new Array();
			positionContentArray[0] = (g_currentArrayIndex + 1) - i;
			positionContentArray[1] = "-";
			positionContentArray[2] = g_currentArrayIndex + 1;
			var pageDir = document.getElementsByTagName("html")[0].dir;
			if (pageDir == "rtl")
			{
				positionContentArray.reverse();
			}	
			var positionContent = positionContentArray[0]+positionContentArray[1]+positionContentArray[2];
			if(g_currentArrayIndex == headlineCount)
			{
				for (var j = i; j < g_countToView; j++)
				{
					if(j < g_countToView)
					{
						eval("FeedItem"+j).style.border = "";
					}
					g_currentArrayIndex++;
				}
				return;
			}
			
			eval("FeedItem"+i).style.borderBottom = "dotted 1px #3b4458";
			eval("FeedItemLink"+i).style.textOverflow = "ellipsis";
			eval("FeedItemLink"+i).style.overflow = "hidden"; 
			eval("FeedItemLink"+i).style.whiteSpace = "nowrap"; 
			eval("FeedItemLink"+i).style.width = g_curLinkWidth;
			positionNumbers.innerText = positionContent;
			var countNow = g_returnFeed.feedItems[g_currentArrayIndex].feedItemCount;
			var feedItemName = g_returnFeed.feedItems[g_currentArrayIndex].feedItemName;
			g_viewElements.FeedItems[i].setAttribute("title",feedItemName);
			if(!g_returnFeed.feedItems[g_currentArrayIndex].feedItemIsRead)
			{
				g_viewElements.FeedItems[i].className="unreadItem";
			}
			else
			{				
				g_viewElements.FeedItems[i].className="readItem";
			}
			g_viewElements.FeedItems[i].innerText = feedItemName;
			g_viewElements.FeedItems[i].href = checkHref(g_returnFeed.feedItems[g_currentArrayIndex].feedItemUrl);
			g_viewElements.FeedItems[i].setAttribute("name", g_returnFeed.feedItems[g_currentArrayIndex].feedItemParentPath);
			g_viewElements.FeedItems[i].setAttribute("localId", g_returnFeed.feedItems[g_currentArrayIndex].feedItemID);			
			eval("FeedItemName"+i).innerText = g_returnFeed.feedItems[g_currentArrayIndex].feedItemParent;
			eval("FeedItemName"+i).setAttribute("title",g_returnFeed.feedItems[g_currentArrayIndex].feedItemParent);				
			eval("FeedItemName"+i).style.textOverflow = "ellipsis";
			eval("FeedItemName"+i).style.overflow = "hidden"; 
			eval("FeedItemName"+i).style.whiteSpace = "nowrap"; 
			eval("FeedItemDate"+i).innerText = g_returnFeed.feedItems[g_currentArrayIndex].feedItemDate;
			eval("FeedItemDate"+i).setAttribute("title",g_returnFeed.feedItems[g_currentArrayIndex].feedItemDate);
			eval("FeedItemDate"+i).style.overflow = "hidden";		
			g_currentArrayIndex++;
			clearBack();
		}
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function displayMessage(errorText, bShowSettingsWrench)
{
	clearBorder();
	clearViewElements(); 
	showHideUIElementBlocks( false, false, true);

	stopTimer();
	stopPolling();
	g_timerFlag = false;

	if( bShowSettingsWrench !== undefined && bShowSettingsWrench !== null)
	{
		if ( bShowSettingsWrench )
		{
			System.Gadget.settingsUI = "settings.html";
			g_gadgetErrorFlag = 0;
		}
		else
		{
			System.Gadget.settingsUI = "";
			g_gadgetErrorFlag = 2;
		}
	}


	errorTextHldr.style.textAlign = "center";
	errorTextLink.className = "textView";
	errorTextHldr.style.top = "30%";
	if(errorText == L_FCE_ERRORMESSAGE)
	{
		errorTextLink.innerHTML = "<p style=\"margin:0px;padding-bottom:5px;\">"
								+ "<img src=\"images/rssLogo.png\" border=\"0\" />"
								+ "</p>"+errorText;
		errorTextLink.style.cursor = "pointer";
		errorTextLink.title = L_FCEHOVER_ERRORMESSAGE;
		g_gadgetErrorFlag = 1;
	}
	else
	{
		errorTextLink.style.cursor = "default";
		errorTextLink.innerHTML = errorText;
		errorTextLink.title = "";
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function clearBorder()
{
	for (var i = 0; i < 4; i++)
	{				
		if(eval("FeedItem"+i) != undefined)
		{
			eval("FeedItem"+i).style.border = "";
		}
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function showSpinner(posTop)
{
	clearViewElements();
	clearBorder();
	errorTextLink.innerHTML = "<p style=\"margin:0px;padding-bottom:10px;\">"
							+ "<img border=\"0\" src=\"images/16-on-black.gif\" />"
							+ "</p>"+L_LOADING_TEXT;
	errorTextLink.className = "textLoad";
	errorTextLink.style.cursor = "default";
	errorTextLink.title = L_LOADING_TEXT;

	showHideUIElementBlocks( false, true, true)

	errorTextHldr.style.textAlign = "center";
	errorTextHldr.style.top = posTop;
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function OnItemClick()
{		
	if(g_gadgetErrorFlag > 0)
	{
		if(g_gadgetErrorFlag == 1)
		{
		System.Gadget.Settings.write("rssFeedPath", "");
		showSpinner('35%');
		this.blur();
		loadMSFeedManager();
		downloadAllFeeds(g_msFeedManager.RootFolder);
		g_msFeedManager = null;		
		g_loadFirstTime = "existingGadget";
		System.Gadget.Settings.write("loadFirstTime", g_loadFirstTime);
		if(g_downloadErrorFlag)
		{
				setTimeout(loadMain, g_loadingMilliSecs);
		}
		else
		{
				loadMain();
		}
		}
		else if(g_gadgetErrorFlag == 2)
		{
			window.location = 'http://go.microsoft.com/fwlink/?LinkId=69153';
		}
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function downloadAllFeeds(folderToAdd)
{ 
	loadMSFeedManager();
	var currentFolder;
	var currentFeeds;		
	var feedDefault;			
	
	if (folderToAdd.IsRoot)
	{
		currentFeeds = folderToAdd.Feeds;
		for (var feedIndex = 0; feedIndex < currentFeeds.Count; feedIndex++)
		{
			try
			{
				feedDefault = safeGetFeed(currentFeeds.Item(feedIndex).Path);
			}
			catch(e)
			{
				displayMessage(L_MSIE_ERRORMESSAGE, false);
				g_timerFlag = false;
			}
			try
			{
				feedDefault.Download();
			}
			catch(e)
			{
				g_downloadErrorFlag = true;
			}
		}
		downloadAllFeeds(folderToAdd.SubFolders);
		return;
	}
	for (var folderIndex = 0; folderIndex < folderToAdd.Count; folderIndex++)
	{
		currentFolder = folderToAdd.Item(folderIndex);
		currentFeeds = currentFolder.Feeds;
		for (var feedIndex = 0; feedIndex < currentFeeds.Count; feedIndex++)
		{
			try
			{
				feedDefault = safeGetFeed(currentFeeds.Item(feedIndex).Path);
			}
			catch(e)
			{
				displayMessage(L_MSIE_ERRORMESSAGE, false);
				g_timerFlag = false;
			}
			try
			{
				feedDefault.Download();
			}
			catch(e)
			{
				g_downloadErrorFlag = true;
			}
		}
		if (currentFolder.Subfolders.Count > 0)
		{
			downloadAllFeeds(currentFolder.Subfolders);
		}
	}
	loadMSFeedManager();
	if(g_msFeedManager.BackgroundSyncStatus == 0)
	{
		g_msFeedManager.BackgroundSync(1);
	}
	g_msFeedManager = null;
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function showFlyout(feedAll)
{
	g_feedForFlyout = feedAll.name;
	g_feedURL = feedAll.href;
	g_feedTitle = feedAll.innerText;
	g_feedID = feedAll;
	g_feedLocalId = feedAll.localId;
	g_feedID.innerText=g_feedTitle;
	g_timerFlyoutFlag = true;
	markAsRead();
	if (event.type == "click")
	{
		if(g_feedURL == g_lastClickedUrl)
		{
			stopTimer();
			System.Gadget.Flyout.show = false;
			g_lastClickedUrl = "";
			g_timerFlyoutFlag = false;
		}	
		if(System.Gadget.Flyout.show)
		{
			addContentToFlyout();
			g_lastClickedUrl = feedAll.href;
		}
		else
		{
			System.Gadget.Flyout.show = true;
			System.Gadget.Flyout.onShow = function()
			{
				stopTimer();
				addContentToFlyout();
			}
			System.Gadget.Flyout.onHide = function()
			{
				g_feedClicked = null;
				clearBack();
				if(g_timerFlyoutFlag)
				{
					startTimer();
				}
				g_timerFlyoutFlag = true;
			}
			g_lastClickedUrl = feedAll.href;
		}

	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function markAsRead()
{
	if( g_returnFeed == null )
		return;

	for(var i = 0; i < g_returnFeed.feedItems.length; i++)
	{ 
		if(g_returnFeed.feedItems[i].feedItemUrl == g_feedURL)
		{
			g_returnFeed.feedItems[i].feedItemIsRead = true;
			g_viewElements.FeedItems[i%4].className="readItem";
		}
	}
	loadMSFeedManager();
	try
	{
		var currentFeeds = safeGetFeed(g_feedForFlyout);
		var currentFeed = currentFeeds.getItem(g_feedLocalId);
		currentFeed.IsRead = true;
	}
	catch(e)
	{
	}
	g_msFeedManager = null;
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function hideFlyout()
{
 System.Gadget.Flyout.show = false;
}

////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function addContentToFlyout()
{
	try
	{
		if(System.Gadget.Flyout.show)
		{
			var flyoutDiv = System.Gadget.Flyout.document;
			loadMSFeedManager();
			try
			{
				var currentFeeds = safeGetFeed(g_feedForFlyout);
				var currentFeed = currentFeeds.getItem(g_feedLocalId);
				var tempTitle = removeNewLines(currentFeed.title);
				flyoutDiv.getElementById("flyoutTitleLink").innerText = tempTitle;
				flyoutDiv.getElementById("flyoutTitleLink").href = checkHref(g_feedURL);
				flyoutDiv.getElementById("flyoutTitleLink").setAttribute("title", tempTitle);
				flyoutDiv.getElementById("flyoutTitleLink").style.textOverflow = "ellipsis";
				flyoutDiv.getElementById("flyoutTitleLink").style.overflow = "hidden"; 
				flyoutDiv.getElementById("flyoutTitleLink").style.whiteSpace = "nowrap"; 
				flyoutDiv.getElementById("flyoutPubDate").innerText = currentFeeds.Name;
				flyoutDiv.getElementById("flyoutPubDate").href = checkHref(currentFeeds.URL);
				flyoutDiv.getElementById("flyoutPubDate").setAttribute("title", currentFeeds.Name);
				flyoutDiv.getElementById("flyoutPubDate").style.textOverflow = "ellipsis";
				flyoutDiv.getElementById("flyoutPubDate").style.overflow = "hidden"; 
				flyoutDiv.getElementById("flyoutPubDate").style.whiteSpace = "nowrap"; 
				flyoutDiv.getElementById("readOnlineLink").href = checkHref(g_feedURL);
				flyoutDiv.getElementById("flyoutMainFeedDescription").innerHTML = currentFeed.Description;
			}
			catch(e)
			{
			}
			g_msFeedManager = null;
		}
	}
	catch(e)
	{
		//catch slow flyout - no div object will be available.
	}
}

////////////////////////////////////////////////////////////////////////////////
//
// Check HTML document direction and position Feed Name and Feed Date as appropriate
//
////////////////////////////////////////////////////////////////////////////////

function updateDivLocation(divFeedNameObject,divFeedDateObject)
{	
	var pageDir = document.getElementsByTagName("html")[0].dir;

	if (pageDir == "rtl")
	{
		divFeedDateObject.style.textAlign = "left";
		divFeedDateObject.style.styleFloat = "left";
		divFeedNameObject.style.textAlign = "right";
		divFeedNameObject.style.styleFloat = "right";
	}
	else
	{
		divFeedDateObject.style.textAlign = "right";
		divFeedDateObject.style.styleFloat = "right";
		divFeedNameObject.style.textAlign = "left";
		divFeedNameObject.style.styleFloat = "left";
	}
}

////////////////////////////////////////////////////////////////////////////////
//
// Gadget DOCKED
//
////////////////////////////////////////////////////////////////////////////////

function dockedState()
{	
	g_curLinkWidth	= "113px";
	g_feedNameLength	= 10;
	if(g_lastCalledArrayIndex)
	{
		g_currentArrayIndex = g_lastCalledArrayIndex;
	}
	else
	{
		g_currentArrayIndex = 0;
	}
	setNextViewItems();
	with(document.body.style)
	{
		height = "173px";
		width = "130px";
	} 
	with(rssfeedBg.style)
	{
		height = "173px";
		width = "130px";
	} 
	rssfeedBg.src = "url(images/rssBackBlue_docked.png)";
    background_.src = "images/rssBackBlue_docked_.png";
	//styleSwitch (name backgroundColor top left height width, fontWeight, fontSize, color, 
	//			paddingTop, paddingBottom, paddingRight, paddingLeft, borderbottom, bordercolor)

	styleSwitch("FeedItemHldr", false, 4, 4, false, false, false, false, false, false, false, 4, false, false, false);	
	styleSwitch("navHolder", false, 147, 25, 20, 75, false, false, false, false, false, false, false, false, false); 
	for (i=0; i < g_countToView; i++)
	{		
		styleSwitch(eval("FeedItem"+i), false, false, false, 35, 121, false, 12, '#ffffff', 5, 1, 4, 6, false, false);
		styleSwitch(eval("FeedItemName"+i), false, false, false, 14, 55, false, 11, '#67788a', 0, 0, 0, 0, false, false);
		styleSwitch(eval("FeedItemDate"+i), false, false, false, 14, 55, false, 11, '#67788a', 0, 0, 0, 0, false, false);
		eval("FeedItem"+i).style.lineHeight = "13px";
		eval("FeedItem"+i).style.overflow = "hidden";		
		eval("FeedItemName"+i).style.lineHeight = "12px";
		eval("FeedItemDate"+i).style.lineHeight = "12px";

		updateDivLocation( eval("FeedItemName"+i) , eval("FeedItemDate"+i) )
	
 }	
}
////////////////////////////////////////////////////////////////////////////////
//
// Gadget UNDOCKED
//
////////////////////////////////////////////////////////////////////////////////
function undockedState()
{
	g_curLinkWidth	= "250px";
	g_feedNameLength	= 15;
	if(g_lastCalledArrayIndex)
	{
		g_currentArrayIndex = g_lastCalledArrayIndex;
	}
	else
	{
		g_currentArrayIndex = 0;
	}
	setNextViewItems();
	with(document.body.style)
	{
		height = "232px";
		width = "296px";
	}
	with(rssfeedBg.style)
	{
		height = "232px";
		width = "296px";
	} 
	rssfeedBg.src = "url(images/rssBackBlue_undocked.png)";
    background_.src = "images/rssBackBlue_undocked_.png";
	
	//styleSwitch (name backgroundColor top left height width, fontWeight, fontSize, 
	//	color, paddingTop, paddingBottom, paddingRight, paddingLeft, borderbottom, bordercolor)
 
	styleSwitch("FeedItemHldr", false, 14, 13, false, false, false, false, false, false, false, 14, false, false, false); 
	styleSwitch("navHolder", false, 190, 106, 20, 75, false, false, false, false, false, false, false, false, false);
 
	for (i=0; i < g_countToView; i++)
	{		
		styleSwitch(eval("FeedItem"+i), false, false, false, 44, 264, false, 14, '#ffffff', 7, 2, 7, 7, false, false);
		styleSwitch(eval("FeedItemName"+i), false, false, false, 14, 130, false, 12, '#67788a', 0, 0, 0, 0, false, false);
		styleSwitch(eval("FeedItemDate"+i), false, false, false, 14, 120, false, 12, '#67788a', 0, 0, 0, 0, false, false);
		eval("FeedItem"+i).style.lineHeight = "14px";
		eval("FeedItem"+i).style.overflow = "hidden";		
		eval("FeedItemName"+i).style.lineHeight = "14px";
		eval("FeedItemDate"+i).style.lineHeight = "14px";

		updateDivLocation( eval("FeedItemName"+i) , eval("FeedItemDate"+i) )

 }	
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function styleSwitch(divObject, backgroundColorVal, topVal, leftVal, heightVal, widthVal, fontWeightVal, fontSizeVal, fontColor, marginTopVal, marginBottomVal, marginRightVal, marginLeftVal, borderBottomVal, borderColorVal)
{
	with(eval(divObject).style)
	{
		if(topVal)
		{
			top = topVal + "px";
		}
		if(leftVal)
		{
			left = leftVal + "px";
		}
		if(heightVal)
		{
			height = heightVal + "px";
		}		
		if(widthVal)
		{
			width = widthVal + "px";
		}	
		if(fontWeightVal)
		{
			fontWeight = fontWeightVal;
		}
		if(fontSizeVal)
		{
			fontSize = fontSizeVal + "px";
		}		
		if(fontColor)
		{
			color = fontColor;
		}
		if(marginTopVal)
		{
			paddingTop = marginTopVal + "px";
		}
		if(marginBottomVal)
		{
			paddingBottom = marginBottomVal + "px";
		}
		if(marginLeftVal)
		{
			paddingLeft = marginLeftVal+ "px";
		}
		if(marginRightVal)
		{
			paddingRight = marginRightVal+ "px";
		}
		if(borderBottomVal)
		{
			borderBottom = "dotted "+ borderBottomVal + "px";
		}
		if(borderColorVal)
		{
			borderColor = borderColorVal;
		}
		if(backgroundColorVal)
		{
			backgroundColor = backgroundColorVal;
		}
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function toggleBack(objToChange, showBack)
{	
	if(objToChange.innerText != g_feedClicked)
	{
		if(!System.Gadget.docked) 
		{
			var backgroundToLoad = "url(images/item_hover_floating.png)";
		} 
		else if (System.Gadget.docked)
		{
			var backgroundToLoad = "url(images/item_hover_docked.png)"; 
		}
		if(showBack)
		{
			eval("objToChange").style.backgroundImage = backgroundToLoad; 
		}
		else
		{
			eval("objToChange").style.backgroundImage = ""; 
		}
	}
}
////////////////////////////////////////////////////////////////////////////////
//
// set/swap background image when clicked/dblclicked
//
////////////////////////////////////////////////////////////////////////////////
function selectBack(objToChange)
{	
	g_feedClicked = objToChange.innerText;
	clearBack();
} 
////////////////////////////////////////////////////////////////////////////////
//
// clear background image's and set selected article with image
//
////////////////////////////////////////////////////////////////////////////////
function clearBack()
{	
	for(var i = 0; i < 4; i++)
	{
		if(eval("FeedItem"+i).innerText == g_feedClicked)
		{ 
			setSelectBack(eval("FeedItem"+i));			
		}
		else
		{
			eval("FeedItem"+i).style.backgroundImage = "";
		}
	} 
}
////////////////////////////////////////////////////////////////////////////////
//
// Set the background image
//
//////////////////////////////////////////////////////////////////////////////// 
function setSelectBack(objToChange)
{
	if(objToChange.innerText == g_feedClicked)
	{
		if(!System.Gadget.docked) 
		{
			var backgroundToLoad = "url(images/rss_headline_glow_floating.png)";
		} 
		else if (System.Gadget.docked)
		{
			var backgroundToLoad = "url(images/rss_headline_glow_docked.png)"; 
		}
		eval("objToChange").style.backgroundImage = backgroundToLoad; 
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function toggleButton(objToChange, newSRC)
{		
 eval("objToChange").src = "images/"+newSRC;
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////
function mouseWheeNavigate()
{
	if( g_returnFeed == null )
		return;

	var headlineCount = g_returnFeed.feedItems.length;
	if(g_totalViewableItems < headlineCount)
	{
		headlineCount = g_totalViewableItems;
	}
	if(event.wheelDelta < -20)
	{
		setNextViewItems();
	}
	if(event.wheelDelta > 20)
	{
		setPreviousViewItems();
	}
}

////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////

function keyNavigate()
{ 
	switch(event.keyCode)
	{

		case 38:
		case 104:
			setPreviousViewItems();
			break;
		case 40:
		case 98:
			setNextViewItems();
			break;
		case 32: 
		case 13:
			if(event.srcElement.id == "buttonLeftNarrator")
			{
				setPreviousViewItems();
			}
			else if(event.srcElement.id == "buttonRightNarrator")
			{
				setNextViewItems();
			}
			break;
		case 27:
			hideFlyout();
			break;
	}
}
////////////////////////////////////////////////////////////////////////////////
//
//
////////////////////////////////////////////////////////////////////////////////

function keyNavigateClose()
{ 
	switch(event.keyCode)
	{
		case 27:
			hideFlyout();
			break;
	}
}


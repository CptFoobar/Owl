const DEFAULT_CLASSICS = [];

const INVERT_STYLE_FILE = "data/css/owlInverted.css";
const CLASSIC_STYLE_FILE = "data/css/owlClassic.css";
const PDF_INVERT_STYLE_FILE = "data/css/pdfInversion.css";
const CMD_TOGGLE_OWL = "toggle-owl";
const CMD_TOGGLE_CLASSIC = "toggle-classic";
const CMD_TOGGLE_CURRENT_SITE = "toggle-current-site";
const NO_STYLE = "no_style";

var owlMode = false;
var activateOnStartup = false;
var alwaysClassic = false;
var invertPdf = true;
var owlMode = activateOnStartup;
var allowIncognito = true;
var defaultStyleFile = alwaysClassic ? CLASSIC_STYLE_FILE : INVERT_STYLE_FILE;
var localFiles = false;
/* Site configuration lists */
var alwaysDisableSites = [];
var alwaysEnableSites = [];
var alwaysHCSites = [];
// Set techcrunch.com as default classic
var classicSiteList = DEFAULT_CLASSICS;
// debugging flag
var devMode = true;

browser.storage.local.get().then((settings) => {
    // reset storage if nothing is stored so far
    if (!settings || (Object.keys(settings).length === 0 && settings.constructor === Object)) {
        resetStorage();
    } else {
        activateOnStartup = settings.owlOnStartup;
        owlMode = activateOnStartup;
        alwaysClassic = settings.alwaysClassic;
        invertPdf = settings.invertPdf;
        allowIncognito = settings.allowIncognito;
        defaultStyleFile = alwaysClassic ? CLASSIC_STYLE_FILE : INVERT_STYLE_FILE;
        localFiles = settings.localFiles;
        /* Site configuration lists */
        alwaysDisableSites = settings.whiteSites;
        alwaysEnableSites = settings.alwaysEnableSites;
        /* Set default classics */
        classicSiteList = settings.classicSiteList;
    }
}, logError);

var owlButton = browser.browserAction;
var owlPageAction = browser.pageAction;

if (activateOnStartup) {
    setOwl(owlMode);
}

owlButton.onClicked.addListener((tab) => {
    owlMode = !owlMode;
    setOwl(owlMode);
});

// Add listener to add/remove Owl CSS on new tabs
browser.tabs.onCreated.addListener(tabOpenListener);
browser.tabs.onUpdated.addListener(tabOpenListener);
browser.commands.onCommand.addListener(commandHandler);
browser.runtime.onMessage.addListener(panelMessageListener);

// preference change listeners
browser.runtime.onMessage.addListener(listenPrefUpdate);

// Set update listener to show 'Welcome' page
browser.runtime.onInstalled.addListener((details) => {
    if (details.reason == "update") showWelcomePage(true);
});

/* returns JSON with paths to icon according to condition. */
function iconSet(condition) {
    var infix = (condition ? "enabled" : "disabled");
    return {
        16: "data/icons/" + infix + "-16.png",
        32: "data/icons/" + infix + "-32.png",
        64: "data/icons/" + infix + "-64.png",
        96: "data/icons/" + infix + "-96.png"
    };
}

function setOwl(oMode) {
    debugLog(`Setting Owl: ${oMode}`);
    // Set icon and button label
    owlButton.setIcon({ "path": iconSet(oMode) });
    owlButton.setTitle({ "title": "Owl is " + (oMode ? "enabled" : "disabled") });
    // Apply/Remove Owl CSS and show/hide pageAction to all current tabs
    var allTabs = browser.tabs.query({});
    allTabs.then((tabs) => { setOwlOnTabs(tabs, oMode) }, logError);
}

function setOwlOnTabs(tabs, oMode) {
    for (let tab of tabs) {
        if (tab.url.match(/^about:/)) {
            continue;
        }
        if (!allowIncognito && tab.incognito && oMode) {
            continue;
        }
        var fileUrl = getStyleFileForUrl(getDomainFromUrl(tab.url));
        if (fileUrl == NO_STYLE) {
            continue;
        }
        var cssOperation = null;
        if (indexInArray(getDomainFromUrl(tab.url), alwaysEnableSites) > -1) {
            cssOperation = browser.tabs.insertCSS(tab.id, makeCssConfig(fileUrl));
        }
        else if (oMode) {
            cssOperation = browser.tabs.insertCSS(tab.id, makeCssConfig(fileUrl));
        } else {
            cssOperation = browser.tabs.removeCSS(tab.id, makeCssConfig(fileUrl));
            browser.tabs.removeCSS(tab.id, makeCssConfig(PDF_INVERT_STYLE_FILE));
        }
        cssOperation.then(() => {
            if (invertPdf && oMode)
                browser.tabs.insertCSS(tab.id, makeCssConfig(PDF_INVERT_STYLE_FILE));
        }, logError);
        // Show/hide pageAction
        if (!tab.url.match(/^about:/)) {
            owlPageAction.show(tab.id);
        }
    }
}

function tabOpenListener(tab) {
    if (tab.id) {
        setOwlOnTabs([tab], owlMode);
    } else {
        // When  tab isn't done loading, we only get it's id and not the tab
        // object. Query for that tab and set Owl when it's ready
        var gettingTab = browser.tabs.get(tab);
        gettingTab.then((tab) => { setOwlOnTabs([tab], owlMode) }, logError);
    }
}

function panelMessageListener(message) {
    var querying = browser.tabs.query({currentWindow: true, active: true});
    querying.then((tabs) => {
        handlePanelMessage(message, tabs[0]);
    }, null);
}

function handlePanelMessage(message, tab) {
    var tabUrl = getDomainFromUrl(tab.url);
    var tabId = tab.id;
    switch(message.intent) {
        case "getTabConfig": {
            browser.runtime.sendMessage({
                intent: "tabConfig",
                mode: owlMode,
                classic: (indexInArray(tabUrl, classicSiteList) > -1),
                alwaysDisable: (indexInArray(tabUrl, alwaysDisableSites) > -1),
                alwaysEnable: (indexInArray(tabUrl, alwaysEnableSites) > -1),
                alwaysClassic: alwaysClassic,
				highContrast: (indexInArray(tabUrl, alwaysHCSites) > -1)
            });
            break;
        }
        case "toggleOwl": {
            owlMode = message.value;
            setOwl(owlMode);
            break;
        }
        case "useClassicTheme": {
            if (tabUrl.length > 0) {
                manipClassic(indexInArray(tabUrl, classicSiteList), tabUrl, message.value, tabId);
                refreshOwl();
            }
            break;
        }
        case "disableWebsite": {
            var tabStyle = getStyleFileForUrl(tabUrl);
            if (tabUrl.length > 0) {
                var index = indexInArray(tabUrl, alwaysDisableSites);
                if (message.value) {
                    if (index == -1) {
                        if (!alwaysDisableSites)
                            alwaysDisableSites = [];
                        alwaysDisableSites.push(tabUrl);
                        browser.storage.local.set({
                            whiteSites: alwaysDisableSites
                        });
                        if (tabStyle != NO_STYLE)
                            browser.tabs.removeCSS(tabId, makeCssConfig(tabStyle)).then(null, logError);
                    }
                } else {
                    alwaysDisableSites.splice(index, 1);
                    browser.storage.local.set({
                        whiteSites: alwaysDisableSites
                    });
                    if (tabStyle != NO_STYLE)
                        browser.tabs.insertCSS(tabId, makeCssConfig(tabStyle)).then(null, logError);
                }
                debugLog("alwaysDisabled " + JSON.stringify(alwaysDisableSites));
            }
            refreshOwl();
            break;
        }
        case "alwaysEnableWebsite": {
            var tabStyle = getStyleFileForUrl(tabUrl);
            if (tabUrl.length > 0) {
                var index = indexInArray(tabUrl, alwaysEnableSites);
                if (message.value) {
                    if (index == -1) {
                        if (!alwaysEnableSites)
                            alwaysEnableSites = [];
                        alwaysEnableSites.push(tabUrl);
                        browser.storage.local.set({
                            alwaysEnableSites: alwaysEnableSites
                        });
                        if (!owlMode) {
                            browser.tabs.insertCSS(tabId, makeCssConfig(tabStyle)).then(null, logError);
                        }
                    }
                } else {
                    alwaysEnableSites.splice(index, 1);
                    browser.storage.local.set({
                        alwaysEnableSites: alwaysEnableSites
                    });
                    if (!owlMode)
                        browser.tabs.removeCSS(tabId, makeCssConfig(tabStyle)).then(null, logError);
                }
                debugLog("alwaysEnableWebsite " + JSON.stringify(alwaysEnableSites));
            }
            refreshOwl();
            break;
        }
        case "getSiteSettings": {
            debugLog("Sending siteSettings");
            browser.runtime.sendMessage({
                intent: "siteSettings",
                payload: {
                    whitelistSites: alwaysDisableSites,
                    classicSites: classicSiteList,
                    alwaysEnableSites: alwaysEnableSites,
					highContrastSites: alwaysHCSites
                }
            });
            break;
        }
        case "deleteClassicSite": {
            var index = indexInArray(message.site, classicSiteList);
            if (index > -1) {
                classicSiteList.splice(index, 1);
                browser.storage.local.set({
                    classicSiteList: classicSiteList
                });
            }
            break;
        }
        case "deleteWhitelistSite": {
            var index = indexInArray(message.site, alwaysDisableSites);
            if (index > -1) {
                alwaysDisableSites.splice(index, 1);
                browser.storage.local.set({
                    whiteSites: alwaysDisableSites
                });
            }
            break;
        }
        case "deleteEnabledSite": {
            var index = indexInArray(payload.site, alwaysEnableSites);
            if (index > -1) {
                alwaysEnableSites.splice(index, 1);
                browser.storage.local.set({
                    alwaysEnableSites: alwaysEnableSites
                });
            }
        }
    }
}

function getStyleFileForUrl(tabUrl) {
    /* Check if file is local file */
    if (tabUrl.indexOf("file://") > -1 && !localFiles)
        return NO_STYLE;

    /* Check if site is whitelisted */
    if (indexInArray(tabUrl, alwaysDisableSites) > -1)
            return NO_STYLE;

    /* Default for all websites is defaultStyleFile */
    var tabStyle = defaultStyleFile;

    /* Check if user has selected classic theme for given site */
    if (indexInArray(tabUrl, classicSiteList) > -1)
            tabStyle = CLASSIC_STYLE_FILE;

    return tabStyle;
}

function getDomainFromUrl(url) {
    var domain = "";
    if (url.indexOf("file://") > -1)
        return url;

    // find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    // find & remove port number
    domain = domain.split(':')[0];

    return domain;
}

function indexInArray(item, itemList) {
    for (var i = 0; i < itemList.length; i++)
        if (itemList[i] === item)
            return i;
    return -1;
}

function activeTabInList(siteList) {
    var domain = getDomainFromUrl(tabs.activeTab.url);
    if (domain.length > 0)
        return indexInArray(domain, siteList) > -1;
    else return false;
}

function manipClassic(index, host, toAdd, tabId) {
    if (!classicSiteList)
        classicSiteList = [];
    if (index === -1 && toAdd) {
        classicSiteList.push(host);
        browser.storage.local.set({
            classicSiteList: classicSiteList
        });
        browser.tabs.removeCSS(tabId, makeCssConfig(INVERT_STYLE_FILE)).then(() => {
            browser.tabs.insertCSS(tabId, makeCssConfig(CLASSIC_STYLE_FILE)).then(null, logError);
        });
    } else if (!toAdd) {
        classicSiteList.splice(index, 1);
        browser.storage.local.set({
            classicSiteList: classicSiteList
        });
        browser.tabs.removeCSS(tabId, makeCssConfig(CLASSIC_STYLE_FILE)).then(() => {
            browser.tabs.insertCSS(tabId, makeCssConfig(INVERT_STYLE_FILE)).then(null, logError);
        });
    }
};

function makeCssConfig(file_url) {
    return {
        file: file_url,
        matchAboutBlank: true,
        runAt: "document_start"
    };
}

function commandHandler(command) {
    switch (command) {
        case CMD_TOGGLE_OWL: {
            owlMode = !owlMode;
            setOwl(owlMode);
            break;
        }
        case CMD_TOGGLE_CLASSIC: {
            if (owlMode) {
                var querying = browser.tabs.query({currentWindow: true, active: true});
                querying.then((tabs) => {
                    var host = getDomainFromUrl(tabs[0].url);
                    if (host.length > 0 && getStyleFileForUrl(host) != NO_STYLE) {
                        var index = indexInArray(host, classicSiteList);
                        if (index === -1) manipClassic(index, host, true);
                        else manipClassic(index, host, false);
                    }
                    refreshOwl();
                    updatePanelConfig();
                }, null);
            break;
            }
        }
        case CMD_TOGGLE_CURRENT_SITE: {
            var querying = browser.tabs.query({currentWindow: true, active: true});
            querying.then((tabs) => {
                var tabId = tabs[0].id;
                var tabUrl = getDomainFromUrl(tabs[0].url);
                var tabStyle = getStyleFileForUrl(tabUrl);
                if (tabUrl.length > 0) {
                    var index = indexInArray(tabUrl, alwaysDisableSites);

                    if (index == -1) {
                        alwaysDisableSites.push(tabUrl);
                        browser.storage.local.set({
                            whiteSites: alwaysDisableSites
                        });
                        if (tabStyle != NO_STYLE)
                            browser.tabs.removeCSS(tabId, makeCssConfig(tabStyle)).then(null, logError);
                    } else {
                        alwaysDisableSites.splice(index, 1);
                        browser.storage.local.set({
                            whiteSites: alwaysDisableSites
                        });
                        if (tabStyle != NO_STYLE)
                            browser.tabs.insertCSS(tabId, makeCssConfig(tabStyle)).then(null, logError);
                    }
                    debugLog("alwaysDisabled " + JSON.stringify(alwaysDisableSites));
                }
                refreshOwl();
            }, logError);
            break;
        }
    }
}

function resetStorage() {
    browser.storage.local.set({
        owlOnStartup: false,
        alwaysClassic: false,
        invertPdf: true,
        invertLocalFiles: false,
        allowIncognito: true,
        whiteSites: [],
        alwaysEnableSites: [],
        classicSiteList: DEFAULT_CLASSICS
    });
    activateOnStartup = false;
    alwaysClassic = false;
    invertPdf = true;
    allowIncognito = true;
    defaultStyleFile = alwaysClassic ? CLASSIC_STYLE_FILE : INVERT_STYLE_FILE;
    localFiles = false;
    /* Site configuration lists */
    alwaysDisableSites = [];
    alwaysEnableSites = [];
    /* Set default classics */
    classicSiteList = [];
}

function logError(error) {
    debugLog("Error: " + JSON.stringify(error));
}

function debugLog(string) {
    if (devMode)
        console.log("[OWL] ", string);
}

function isEmptyObject(obj) {
    return (Object.keys(obj).length === 0 && obj.constructor === Object);
}

function hasNoKeys(obj) {
    return (Object.keys(obj).length === 0);
}

function listenPrefUpdate(message) {
    if (message.intent == "prefUpdate") {
        switch (message.prefName) {
            case "alwaysClassic": {
                alwaysClassic = message.prefValue;
                defaultStyleFile = alwaysClassic ? CLASSIC_STYLE_FILE : INVERT_STYLE_FILE;
                break;
            }
            case "invertPdf": {
                invertPdf = message.prefValue;
                break;
            }
            case "allowIncognito": {
                allowIncognito = message.prefValue;
                break;
            }
            case "localFiles": {
                localFiles = message.prefValue;
                break;
            }
        }
        refreshOwl();
    }
}

function refreshOwl() {
    if (owlMode) {
        setOwl(false);
        setOwl(owlMode);
    }
}

function showWelcomePage(isUpdateNotif) {
    var welcomeUrl = "data/markup/welcome.html" + (isUpdateNotif ? "?update=y" : "");
    debugLog(welcomeUrl);
    var creating = browser.tabs.create({
        "url": browser.extension.getURL(welcomeUrl)
      });
      creating.then(null, null);
}

/* SDK Modules */
const self = require("sdk/self");
const data = self.data;
const pageMod = require("sdk/page-mod");
const prefSet = require("sdk/simple-prefs");
const ss = require("sdk/simple-storage");
const tabs = require("sdk/tabs");
const privateBrowsing = require("sdk/private-browsing");
const panel = require("sdk/panel");
const { attach, detach } = require('sdk/content/mod');
const { setTimeout } = require("sdk/timers");
const { Hotkey } = require("sdk/hotkeys");
const { Style } = require('sdk/stylesheet/style');
const { MenuButton } = require("./data/lib/menu_button/menu-button");

/* Set styles to be used */
const classicStyle = Style({ uri: "./css/owlClassic.css" });
const invertStyle = Style({ uri: "./css/owlInverted.css" });
const CLASSIC_STYLE = "classicStyle";
const INVERT_STYLE = "invertStyle";
const pdfInversionStyle = Style({ uri: "./css/pdfInversion.css" });

/* Add-on URLs */
const OWL_PANEL_URL = data.url("markup/panel.html");
const REMINDER_PANEL_URL = data.url("markup/support.html");
const CONTRIB_PAGE_URL = data.url("markup/about.html#contribute");
const CONFIG_PAGE_URL = data.url("markup/configure_sites.html");
const WELCOME_PAGE_URL = data.url("markup/welcome.html");
// Week in seconds
const REMINDER_INTERVAL = 1000 * 60 * 60 * 24 * 7;

const DEFAULT_CLASSICS = ["techcrunch.com", "amazon.ca", "tomshardware.com",
                        "pcpartpicker.com", "ebay.ca", "ebay.in"];

const DEFAULT_DISABLED_SITES = ["resource://blink", "resource://owl"]

/* Init variables */
var activateOnStartup = prefSet.prefs.owlOnStartup;
var alwaysClassic = prefSet.prefs.alwaysClassic;
var invertPdf = prefSet.prefs.invertPdf;
var owlMode = activateOnStartup;
var allowIncognito = prefSet.prefs.allowIncognito;
var defaultStyle = alwaysClassic ? classicStyle : invertStyle;
var localFiles = prefSet.prefs.localFiles;
var classicHotkeyShortcut = prefSet.prefs.classicHotkeyCharacter;
var owlHotkeyShortcut = prefSet.prefs.owlHotkeyCharacter;
/* Site configuration lists */
var alwaysDisableSites = ss.storage.whiteSites || [];
var alwaysEnableSites = ss.storage.alwaysEnableSites || [];
// Set techcrunch.com as default classic
var classicSiteList = ss.storage.classicSiteList || DEFAULT_CLASSICS;
var owlHotkey = null;
var classicHotkey = null;

/* Owl Toggle Button */
var owlButton = MenuButton({
    id: "owl-button",
    label: "Owl " + (activateOnStartup ? "On" : "Off"),
    icon: iconSet(activateOnStartup),
    onClick: handleClick
});

/* Click handler for OwlButton */
function handleClick(state, isMenu) {
    if (isMenu) {
        togglePanel(state);
    } else {
       owlMode = !owlMode;
       setOwl(owlMode);
    }
}

/* Set Icon according to condition. Used by `setOwl(...)` */
function iconSet(condition) {
    return {
        "16": data.url("icons/" + (condition ? "enabled" : "disabled") + "-16.png"),
        "32": data.url("icons/" + (condition ? "enabled" : "disabled") + "-32.png"),
        "64": data.url("icons/" + (condition ? "enabled" : "disabled") + "-64.png")
    };
}

/* Owl popup panel */
var owlPanel = panel.Panel({
    width: 250,
    height: 475,
    contentURL: OWL_PANEL_URL,
    contentScriptFile: [data.url("lib/jquery/jquery-1.11.3.min.js"),
                        data.url("js/panel.js"),
                        data.url("lib/bootstrap_toggle/bootstrap-toggle.min.js")]
});

/* Panel show listener */
owlPanel.on("show", function() {
    updatePanelConfig();
});

/* Panel port message listeners */
owlPanel.port.on("toggle_owl", function(payload) {
    owlMode = payload.value;
    setOwl(owlMode);
});

owlPanel.port.on("use_classic_theme", function(payload) {
    var host = getDomainFromUrl(tabs.activeTab.url);
    if (host.length > 0) {
        var index = indexInArray(host, classicSiteList);
        manipClassic(index, host, payload.value);
        refreshOwl();
    }
});

owlPanel.port.on("disable_website", function(payload) {
    var host = getDomainFromUrl(tabs.activeTab.url);
    var tabStyle = getStyleForUrl(tabs.activeTab.url);
    if (host.length > 0) {
        var index = indexInArray(host, alwaysDisableSites);
        if (payload.value) {
            if (index == -1) {
                alwaysDisableSites.push(host);
                ss.storage.whiteSites = alwaysDisableSites;
                detachStyle(tabStyle, tabs.activeTab);
            }
        } else {
            alwaysDisableSites.splice(index, 1);
            ss.storage.whiteSites = alwaysDisableSites;
            if (tabStyle != "no_style")
                attachStyle(tabStyle, tabs.activeTab);
        }
    }
    refreshOwl();
});

owlPanel.port.on("always_enable_website", function(payload) {
    var host = getDomainFromUrl(tabs.activeTab.url);
    var tabStyle = getStyleForUrl(tabs.activeTab.url);
    if (host.length > 0) {
        var index = indexInArray(host, alwaysEnableSites);
        if (payload.value) {
            if (index == -1) {
                alwaysEnableSites.push(host);
                ss.storage.alwaysEnableSites = alwaysEnableSites;
                detachStyle(tabStyle, tabs.activeTab);
                attachStyle(tabStyle, tabs.activeTab);
            }
        } else {
            alwaysEnableSites.splice(index, 1);
            ss.storage.alwaysEnableSites = alwaysEnableSites;
            if (tabStyle != "no_style")
                detachStyle(tabStyle, tabs.activeTab);
        }
    }
    refreshOwl();
});

/* Support reminder popup panel */
var supportPanel = panel.Panel({
    width: 500,
    height: 425,
    contentURL: REMINDER_PANEL_URL,
    contentScriptFile: [data.url("lib/jquery/jquery-1.11.3.min.js"),
                        data.url("js/support.js"),
                        data.url("lib/bootstrap/bootstrap.min.js")]
});

supportPanel.port.on("show_support_link", function() {
    tabs.open(CONTRIB_PAGE_URL);
    hideSupportPanel();
});

supportPanel.port.on("never_remind_again", hideSupportPanel);

function hideSupportPanel() {
    supportPanel.hide();
    ss.storage.showReminder = false;
}

/*
 * Listen for Owl preference changes.
 */
prefSet.on("alwaysClassic", onAlwaysClassicChange);
prefSet.on("invertPdf", onInvertPdfChange);
prefSet.on("allowIncognito", onAllowPrivate);
prefSet.on("localFiles", onLocalFilesChange);
/* Open settings page on preference button click */
prefSet.on("configSitesPref", function() {
    tabs.open(CONFIG_PAGE_URL);
});
prefSet.on("classicHotkeyCharacter", onClassicHotkeyChange);
prefSet.on("owlHotkeyCharacter", onOwlHotkeyChange);

/* Set pagemod for configuration site */
var configMod = pageMod.PageMod({
    include: CONFIG_PAGE_URL,
    contentScriptFile: data.url("js/configurationContentScript.js"),
    onAttach: function(worker) {
        worker.port.emit("configuredSites", {
            "whitelistSites": alwaysDisableSites,
            "classicSites": classicSiteList,
            "alwaysEnableSites": alwaysEnableSites
        });
        worker.port.on("deleteClassicSite", function(payload) {
            var index = indexInArray(payload.site, classicSiteList);
            if (index > -1) {
                classicSiteList.splice(index, 1);
                ss.storage.classicSiteList = classicSiteList;
            }
        });
        worker.port.on("deleteWhitelistSite", function(payload) {
            var index = indexInArray(payload.site, alwaysDisableSites);
            if (index > -1) {
                alwaysDisableSites.splice(index, 1);
                ss.storage.whiteSites = alwaysDisableSites;
            }
        });
        worker.port.on("deleteEnabledSite", function(payload) {
            var index = indexInArray(payload.site, alwaysEnableSites);
            if (index > -1) {
                alwaysEnableSites.splice(index, 1);
                ss.storage.alwaysEnableSites = alwaysEnableSites;
            }
        });
    }
});

function manipClassic(index, host, toAdd) {
    if (index === -1 && toAdd) {
        classicSiteList.push(host);
        ss.storage.classicSiteList = classicSiteList;
        detachStyle(invertStyle, tabs.activeTab);
        attachStyle(classicStyle, tabs.activeTab);
    } else if (!toAdd) {
        classicSiteList.splice(index, 1);
        ss.storage.classicSiteList = classicSiteList;
        detachStyle(classicStyle, tabs.activeTab);
        attachStyle(invertStyle, tabs.activeTab);
    }
};

function updatePanelConfig() {
    owlPanel.port.emit("tab_config", {
        mode: owlMode,
        classic: activeTabInList(classicSiteList),
        alwaysDisable: activeTabInList(alwaysDisableSites),
        alwaysEnable: activeTabInList(alwaysEnableSites),
        alwaysClassic: alwaysClassic
    });
};

function activeTabInList(siteList) {
    var domain = getDomainFromUrl(tabs.activeTab.url);
    if (domain.length > 0)
        return indexInArray(domain, siteList) > -1;
    else return false;
}

function setOwl(oMode) {
    owlButton.icon = iconSet(oMode);
    owlButton.label = "Owl " + (oMode ? "On" : "Off");
    for (let i = 0; i < tabs.length; i++) {
        var style = getStyleForUrl(tabs[i].url);
        if (!style || style == "no_style") {
            continue;
        } else {
            if (indexInArray(getDomainFromUrl(tabs[i].url), alwaysEnableSites) > -1) {
                detachStyle(style, tabs[i]);
                attachStyle(style, tabs[i]);
                continue;
            }
            if (oMode) {
                var tabPrivate = privateBrowsing.isPrivate(tabs[i]);
                if (!tabPrivate || (tabPrivate && allowIncognito))
                    attachStyle(style, tabs[i]);
            }
            else {
                /*
                 * Detach unconditionally, since tabs without style would
                 * remain unaffected
                 */
                detachStyle(style, tabs[i]);
            }
            if (invertPdf && owlMode)
                attach(pdfInversionStyle, tabs[i]);
            else
                detach(pdfInversionStyle, tabs[i]);
        }
    }
}

function togglePanel(state) {
    if (!owlPanel.isShowing) {
        owlPanel.show({
            position: owlButton
        });
    } else {
        owlPanel.hide();
    }
}

function getStyleForUrl(tabUrl) {
    /* Check if file is local file */
    if (tabUrl.indexOf("file://") > -1 && !localFiles)
        return "no_style";

    /* Check if file is in default whitelist */
    for (var j = 0; j < DEFAULT_DISABLED_SITES.length; j++)
        if (tabUrl.indexOf(DEFAULT_DISABLED_SITES[j]) > -1)
            return "no_style";

    /* Check if site is whitelisted */
    for (var j = 0; j < alwaysDisableSites.length; j++)
        if (tabUrl.indexOf(alwaysDisableSites[j]) > -1)
            return "no_style";

    /* Default for all websites is defaultStyle */
    var tabStyle = INVERT_STYLE;

    /* Check if user has selected classic theme for given site */
    for (var j = 0; j < classicSiteList.length; j++)
        if (tabUrl.indexOf(classicSiteList[j]) > -1)
            tabStyle = CLASSIC_STYLE;

    return tabStyle;
}

function getDomainFromUrl(url) {
    var domain = "";
    if (url.indexOf("file://") > -1)
        if (localFiles) return url;
        else return "";
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
}

function tabListener(tab) {
    tabStyle = getStyleForUrl(tab.url);
    if (tabStyle != "no_style") {
        if (owlMode) {
            attachStyle(tabStyle, tab);
            if (invertPdf) attach(pdfInversionStyle, tab);
        }
        else {
            detachStyle(tabStyle, tab);
            detach(pdfInversionStyle, tab);
        }
    }
}

function attachStyle(styleName, tab) {
    var styleFile = (styleName === CLASSIC_STYLE ?
        data.url('js/insertClassic.js') : data.url('js/insertInversion.js'));
    tab.attach({ contentScriptFile: styleFile });
}

function detachStyle(styleName, tab) {
    tab.attach({ contentScriptFile: data.url('js/removeOwlTheme.js') });
}

function setTabListeners() {
    tabs.on('open', tabListener);
    tabs.on('ready', tabListener);
    //tabs.on('*', );
}

function setHotkeys() {
    /* Owl Hotkeys: Shift-Alt-D to toggle Owl, Shift-Alt-C to switch theme */
    owlHotkey = Hotkey({
        combo: "alt-shift-" + String.fromCharCode(97 + owlHotkeyShortcut),
        onPress: function() {
            owlMode = !owlMode;
            setOwl(owlMode);
            updatePanelConfig();
      }
    });

    /* Hotkey for Classic Mode */
    classicHotkey = Hotkey({
        combo: "alt-shift-" + String.fromCharCode(97 + classicHotkeyShortcut),
        onPress: function() {
            if (owlMode) {
                var host = getDomainFromUrl(tabs.activeTab.url);
                if (host.length > 0) {
                    var index = indexInArray(host, classicSiteList);
                    if (index === -1) manipClassic(index, host, true);
                    else manipClassic(index, host, false);
                }
                refreshOwl();
                updatePanelConfig();
            }
      }
    });
}

function indexInArray(url, urlList) {
    for (var i = 0; i < urlList.length; i++)
        if (urlList[i] === url)
            return i;
    return -1;
}

function onAlwaysClassicChange(prefName) {
    if (prefName === "alwaysClassic") {
        alwaysClassic = prefSet.prefs.alwaysClassic;
        if (alwaysClassic)
            defaultStyle = classicStyle;
        else
            defaultStyle = invertStyle;
        refreshOwl();
    }
}

function onInvertPdfChange(prefName) {
    if (prefName === "invertPdf") {
        invertPdf = prefSet.prefs.invertPdf;
        setPdfInversionMode(invertPdf);
        refreshOwl();
    }
}

function onAllowPrivate(prefName) {
    if (prefName === "allowIncognito") {
        allowIncognito = prefSet.prefs.allowIncognito;
        refreshOwl();
    }
}

function onLocalFilesChange(prefName) {
    if (prefName === "localFiles") {
        localFiles = prefSet.prefs.localFiles;
        refreshOwl();
    }
}

function onClassicHotkeyChange(prefName) {
    if(prefName === "classicHotkeyCharacter") {
        if (prefSet.prefs.classicHotkeyCharacter === owlHotkeyShortcut) {
            prefSet.prefs.classicHotkeyCharacter = classicHotkeyShortcut;
        } else {
            classicHotkeyShortcut = prefSet.prefs.classicHotkeyCharacter;
        }
        setHotkeys();
    }
}

function onOwlHotkeyChange(prefName) {
    if(prefName === "owlHotkeyCharacter") {
        if (prefSet.prefs.owlHotkeyCharacter === classicHotkeyShortcut) {
            prefSet.prefs.owlHotkeyCharacter = owlHotkeyShortcut;
        } else {
            owlHotkeyShortcut = prefSet.prefs.owlHotkeyCharacter;
        }
        setHotkeys();
    }
}

function refreshOwl() {
    setOwl(false);
    setOwl(owlMode);
}

function owlInit() {
    /* Turn on Owl if startup preference set */
    if (activateOnStartup) {
        owlMode = true;
        setOwl(owlMode);
    }
    setTabListeners();
    setHotkeys();
    setTimeout(showSupportPanel, 5000);
}

function showSupportPanel() {
    if (ss.storage.showReminder && !owlPanel.isShowing &&
      (Date.now() >= ss.storage.lastReminder + REMINDER_INTERVAL)) {
        supportPanel.show({
            position: owlButton
        });
    } else if (owlPanel.isShowing) {
        setTimeout(showSupportPanel, 10000);
    }
}

function clearSettings() {
    delete ss.storage.classicSiteList;
    delete ss.storage.whiteSites;
    delete ss.storage.alwaysClassic;
    delete ss.storage.alwaysEnableSites;
    delete ss.storage.showReminder;
}

exports.onUnload = function(reason) {
    // Remove PageMod
    configMod.destroy();
    // Clear all settings if add-on is uninstalled
    if (reason === "uninstall")
        clearSettings();
};

/* Main executio starts here */

if (self.loadReason == "install") {
    ss.storage.classicSiteList = classicSiteList;
    ss.storage.whiteSites = alwaysDisableSites;
    ss.storage.alwaysEnableSites = alwaysEnableSites;
    ss.storage.showReminder = true;
    ss.storage.lastReminder = Date.now();
}

/* Open welcome page on install/upgrade */
if (self.loadReason == "install" || self.loadReason == "upgrade")
    tabs.open(WELCOME_PAGE_URL + (self.loadReason == "upgrade" ? "?update=y" : ""));

owlInit();

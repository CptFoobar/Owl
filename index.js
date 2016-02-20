/* SDK Modules */
const self = require("sdk/self");
const data = self.data;
const pageMod = require("sdk/page-mod");
const prefSet = require("sdk/simple-prefs");
const ss = require("sdk/simple-storage");
const tabs = require("sdk/tabs");
const { attach, detach } = require('sdk/content/mod');
const { Hotkey } = require("sdk/hotkeys");
const { Style } = require('sdk/stylesheet/style');
const { MenuButton } = require("./data/lib/menu_button/menu-button");

/* Set styles to be used */
const classicStyle = Style({ uri: "./css/owlClassic.css" });
const invertStyle = Style({ uri: "./css/owlInverted.css" });
const pdfInversionStyle = Style({ uri: "./css/pdfInversion.css" });

/* Init variables */
var showPanel = true;
var activateOnStartup = prefSet.prefs.owlOnStartup;
var alwaysClassic = prefSet.prefs.alwaysClassic;
var invertPdf = prefSet.prefs.invertPdf;
var owlMode = activateOnStartup;
var attachStyle = alwaysClassic ? classicStyle : invertStyle;

/* Whitelist and Classic Theme list */
var whiteSites = ss.storage.whiteSites || [];
// Set techcrunch.com as default classic
var classicSiteList = ss.storage.classicSiteList || ["techcrunch.com"];

/* Owl Toggle Button */
var owlButton = MenuButton({
    id: "owl-button",
    label: "Owl " + (activateOnStartup ? "On" : "Off"),
    icon: {
        "16": data.url("icons/" + (activateOnStartup ? "enabled" : "disabled") + "-16.png"),
        "32": data.url("icons/" + (activateOnStartup ? "enabled" : "disabled") + "-32.png"),
        "64": data.url("icons/" + (activateOnStartup ? "enabled" : "disabled") + "-64.png")
    },
    onClick: handleClick
});

function handleClick(state, isMenu) {
    if (isMenu) {
        togglePanel(state)
    } else {
       owlMode = !owlMode;
       setOwl(owlMode);
    }
}


/* Popup panel */
var panel = require("sdk/panel").Panel({
    width: 250,
    height: 400,
    contentURL: data.url("markup/panel.html"),
    contentScriptFile: [data.url("lib/jquery/jquery-1.11.3.min.js"),
                        data.url("js/panel.js"),
                        data.url("lib/bootstrap_toggle/bootstrap-toggle.min.js")],
    onHide: function() {
        owlButton.state('window', {checked: false});
    }
});

/* Owl Hotkeys: Shift-Alt-D to toggle Owl, Shift-Alt-C to switch theme */
var owlHotKey = Hotkey({
    combo: "alt-shift-d",
    onPress: function() {
        owlMode = !owlMode;
        setOwl(owlMode);
        updatePanelConfig();
  }
});

var classicHotkey = Hotkey({
    combo: "alt-shift-c",
    onPress: function() {
        if (owlMode) {
            var host = getDomainFromUrl(tabs.activeTab.url);
            if (host.length > 0) {
                var index = indexInArray(host, classicSiteList);
                manipClassic(index, host);
                refreshOwl();
                updatePanelConfig();
            }
        }
  }
});

/* Panel show listener */
panel.on("show", function() {
    updatePanelConfig();
});

/* Panel port message listeners */
panel.port.on("toggle_owl", function(payload) {
    owlMode = payload.value;
    setOwl(owlMode);
});

panel.port.on("use_classic_theme", function(payload) {
    var host = getDomainFromUrl(tabs.activeTab.url);
    if (host.length > 0) {
        var index = indexInArray(host, classicSiteList);
        manipClassic(index, host);
        refreshOwl();
    }
});

panel.port.on("disable_website", function(payload) {
    var host = getDomainFromUrl(tabs.activeTab.url);
    var tabStyle = getStyleForUrl(tabs.activeTab.url);
    if (host.length > 0) {
        var index = indexInArray(host, whiteSites);
        if (payload.value) {
            if (index == -1) {
                whiteSites.push(host);
                ss.storage.whiteSites = whiteSites;
                detach(tabStyle, tabs.activeTab);
            }
        } else {
            whiteSites.splice(index, 1);
            ss.storage.whiteSites = whiteSites;
            if (tabStyle != "no_style")
                attach(tabStyle, tabs.activeTab);
        }
    }
    refreshOwl();
});

/* Turn on Owl if startup preference set */
if (activateOnStartup) {
    owlMode = true;
    setOwl(owlMode);
}

/* Listen for Owl startup setting change.
 * Come to think of it, it doesn't really matter since changes for setting can
 * take place at startup, so listening for change during the session makes
 * little sense ¯\_(ツ)_/¯
 */
prefSet.on("alwaysClassic", onAlwaysClassicChange);
prefSet.on("invertPdf", onInvertPdfChange);

/* Open welcome page on install / upgrade */
if (self.loadReason == "install" || self.loadReason == "upgrade")
    require("sdk/tabs").open(data.url("markup/welcome.html"));

/* Set pagemod for configuration site */
var configMod = pageMod.PageMod({
    include: "resource://owl-comfortable-reading-addon/data/markup/configure_sites.html",
    contentScriptFile: data.url("js/configurationContentScript.js"),
    onAttach: function(worker) {
        worker.port.emit("configuredSites", {
            "whitelistSites": whiteSites,
            "classicSites": classicSiteList
        });
        worker.port.on("deleteClassicSite", function(payload) {
            var index = indexInArray(payload.site, classicSiteList);
            if (index > -1) {
                classicSiteList.splice(index, 1);
                ss.storage.classicSiteList = classicSiteList;
            }
        });
        worker.port.on("deleteWhitelistSite", function(payload) {
            var index = indexInArray(payload.site, whiteSites);
            if (index > -1) {
                whiteSites.splice(index, 1);
                ss.storage.whiteSites = whiteSites;
            }
        });
    }
});

/* Open settings page on preference button click */
prefSet.on("configSitesPref", function() {
    tabs.open("resource://owl-comfortable-reading-addon/data/markup/configure_sites.html");
});

function manipClassic(index, host) {
    if (index == -1) {
        classicSiteList.push(host);
        ss.storage.classicSiteList = classicSiteList;
        detach(invertStyle, tabs.activeTab);
        attach(classicStyle, tabs.activeTab);
    } else {
        classicSiteList.splice(index, 1);
        ss.storage.classicSiteList = classicSiteList;
        detach(classicStyle, tabs.activeTab);
        attach(invertStyle, tabs.activeTab);
    }
};

function updatePanelConfig() {
    panel.port.emit("tab_config", {
        mode: owlMode,
        classic: ((indexInArray(getDomainFromUrl(tabs.activeTab.url), classicSiteList) > -1) || alwaysClassic),
        whitelist: (indexInArray(getDomainFromUrl(tabs.activeTab.url), whiteSites) > -1),
        alwaysClassic: alwaysClassic
    });
};

function setOwl(oMode) {
    owlButton.icon = data.url("icons/" + (oMode ? "enabled" : "disabled") + "-64.png");
    owlButton.label = "Owl " + (oMode ? "On" : "Off");
    for (let i = 0; i < tabs.length; i++) {
        var style = getStyleForUrl(tabs[i].url);
        if (!style || style == "no_style") {
            continue;
        } else {
            if (oMode)
                attach(style, tabs[i]);
            else
                detach(style, tabs[i]);
        }
    }
    setPdfInversionMode((invertPdf && oMode));
};

function setPdfInversionMode(pdfMode) {
    for (let i = 0; i < tabs.length; i++) {
        if (pdfMode) attach(pdfInversionStyle, tabs[i]);
        else detach(pdfInversionStyle, tabs[i]);
    }
};

function togglePanel(state) {
    if (!panel.isShowing) {
            panel.show({
            position: owlButton
        });
    } else {
        panel.hide();
    }
};

function getStyleForUrl(tabUrl) {
    /* Check if site is whitelisted */
    for (var j = 0; j < whiteSites.length; j++)
        if (tabUrl.indexOf(whiteSites[j]) > -1)
            return "no_style";

    /* Default for all websites is attachStyle */
    var tabStyle = attachStyle;

    /* Check if user has selected classic theme for given site */
    for (var j = 0; j < classicSiteList.length; j++)
        if (tabUrl.indexOf(classicSiteList[j]) > -1)
            tabStyle = classicStyle;

    return tabStyle;
};

function getDomainFromUrl(url) {
    var domain = "";
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
};

function tabListener(tab) {
    tabStyle = getStyleForUrl(tab.url);
    if (tabStyle != "no_style") {
        if (owlMode) {
            attach(tabStyle, tab);
            if (invertPdf) attach(pdfInversionStyle, tab);
        }
        else {
            detach(tabStyle, tab);
            detach(pdfInversionStyle, tab);
        }
    }
};

function setTabListeners() {
    tabs.on('open', tabListener);
    tabs.on('ready', tabListener);
};

function indexInArray(url, urlList) {
    for (var i = 0; i < urlList.length; i++)
        if (urlList[i] === url)
            return i;
    return -1;
};

function onAlwaysClassicChange(prefName) {
    if (prefName === "alwaysClassic") {
        alwaysClassic = prefSet.prefs.alwaysClassic;
        setOwl(false);
        if (alwaysClassic)
            attachStyle = classicStyle;
        else
            attachStyle = invertStyle;
        setOwl(owlMode);
    }
};

function onInvertPdfChange(prefName) {
    if (prefName === "invertPdf") {
        invertPdf = prefSet.prefs.invertPdf;
        setPdfInversionMode(invertPdf);
    }
};

function refreshOwl() {
    setOwl(false);
    setOwl(owlMode);
};

setTabListeners();

function clearSettings() {
    delete ss.storage.classicSiteList;
    delete ss.storage.whiteSites;
    delete ss.storage.alwaysClassic;
};

exports.onUnload = function(reason) {
    // Remove PageMod
    configMod.destroy();
    // Clear all settings if add-on is uninstalled
    if (reason === "uninstall")
        clearSettings();
};

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
const pdfInversionStyle = Style({ uri: "./css/pdfInversion.css" });

/* Add-on URLs */
const OWL_PANEL_URL = data.url("markup/panel.html");
const REMINDER_PANEL_URL = data.url("markup/support.html");
const CONTRIB_PAGE_URL = data.url("markup/about.html#contribute");
const CONFIG_PAGE_URL = data.url("markup/configure_sites.html");
const WELCOME_PAGE_URL = data.url("markup/welcome.html");
// Week in seconds
const REMINDER_INTERVAL = 1000 * 60 * 60 * 24 * 7;

/* Init variables */
var activateOnStartup = prefSet.prefs.owlOnStartup;
var alwaysClassic = prefSet.prefs.alwaysClassic;
var invertPdf = prefSet.prefs.invertPdf;
var owlMode = activateOnStartup;
var allowIncognito = prefSet.prefs.allowIncognito;
var attachStyle = alwaysClassic ? classicStyle : invertStyle;

/* Whitelist and Classic Theme list */
var whiteSites = ss.storage.whiteSites || [];
// Set techcrunch.com as default classic
var classicSiteList = ss.storage.classicSiteList || ["techcrunch.com"];

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

/* Owl Hotkeys: Shift-Alt-D to toggle Owl, Shift-Alt-C to switch theme */
var owlHotKey = Hotkey({
    combo: "alt-shift-d",
    onPress: function() {
        owlMode = !owlMode;
        setOwl(owlMode);
        updatePanelConfig();
  }
});

/* Hotkey for Classic Mode */
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

/* Owl popup panel */
var owlPanel = panel.Panel({
    width: 250,
    height: 425,
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
        manipClassic(index, host);
        refreshOwl();
    }
});

owlPanel.port.on("disable_website", function(payload) {
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

/* Open welcome page on install/upgrade */
if (self.loadReason == "install" || self.loadReason == "upgrade")
    tabs.open(WELCOME_PAGE_URL);

/* Set pagemod for configuration site */
var configMod = pageMod.PageMod({
    include: CONFIG_PAGE_URL,
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
    tabs.open(CONFIG_PAGE_URL);
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
    owlPanel.port.emit("tab_config", {
        mode: owlMode,
        classic: ((indexInArray(getDomainFromUrl(tabs.activeTab.url), classicSiteList) > -1) || alwaysClassic),
        whitelist: (indexInArray(getDomainFromUrl(tabs.activeTab.url), whiteSites) > -1),
        alwaysClassic: alwaysClassic
    });
};

function setOwl(oMode) {
    owlButton.icon = iconSet(oMode);
    owlButton.label = "Owl " + (oMode ? "On" : "Off");
    for (let i = 0; i < tabs.length; i++) {
        var style = getStyleForUrl(tabs[i].url);
        if (!style || style == "no_style") {
            continue;
        } else {
            if (oMode) {
                var tabPrivate = privateBrowsing.isPrivate(tabs[i]);
                if (!tabPrivate || (tabPrivate && allowIncognito))
                    attach(style, tabs[i]);
            }
            else {
                /*
                 * Detach unconditionally, since tabs without style would
                 * remain unaffected
                 */
                detach(style, tabs[i]);
            }
        }
    }
    setPdfInversionMode((invertPdf && oMode));
}

function setPdfInversionMode(pdfMode) {
    for (let i = 0; i < tabs.length; i++) {
        if (pdfMode) attach(pdfInversionStyle, tabs[i]);
        else detach(pdfInversionStyle, tabs[i]);
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
}

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
}

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
}

function setTabListeners() {
    tabs.on('open', tabListener);
    tabs.on('ready', tabListener);
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
        setOwl(false);
        if (alwaysClassic)
            attachStyle = classicStyle;
        else
            attachStyle = invertStyle;
        setOwl(owlMode);
    }
}

function onInvertPdfChange(prefName) {
    if (prefName === "invertPdf") {
        invertPdf = prefSet.prefs.invertPdf;
        setPdfInversionMode(invertPdf);
    }
}

function onAllowPrivate(prefName) {
    if (prefName === "allowIncognito") {
        allowIncognito = prefSet.prefs.allowIncognito;
        refreshOwl();
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
    setTimeout(showSupportPanel, 5000);
}

function showSupportPanel() {
    /*
    * Check if support reminder was initialised. If it was, check if we need
    * to show reminder.
    */
    if (!ss.storage.lastReminder) {
        ss.storage.showReminder = true;
        ss.storage.lastReminder = Date.now();
    }
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
    delete ss.storage.showReminder;
}

exports.onUnload = function(reason) {
    // Remove PageMod
    configMod.destroy();
    // Clear all settings if add-on is uninstalled
    if (reason === "uninstall")
        clearSettings();
};

owlInit();

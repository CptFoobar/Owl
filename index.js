/* SDK Modules */
const self = require("sdk/self");
const data = self.data;
const tabs = require("sdk/tabs");
const prefSet = require("sdk/simple-prefs");
const ss = require("sdk/simple-storage");
const { attach, detach } = require('sdk/content/mod');
const { Hotkey } = require("sdk/hotkeys");
const { Style } = require('sdk/stylesheet/style');
const { ToggleButton } = require("sdk/ui/button/toggle");

/* Set styles to be used */
const classicStyle = Style({ uri: "./css/owlClassic.css" });
const invertStyle = Style({ uri: "./css/owlInverted.css" });

/* Init variables */
var showPanel = true;
var activateOnStartup = prefSet.prefs.owlOnStartup;
var owlMode = activateOnStartup;
const breakingSiteRoots = ["techcrunch.com"];

/* Whitelist and Classic Theme list */
var classicSiteList = ss.storage.classicSiteList || [];
var whiteSites = ss.storage.whiteSites || [];

var owlButton = ToggleButton({
    id: "owl-button",
    label: "Owl " + (activateOnStartup ? "On" : "Off"),
    icon: {
        "16": data.url("icons/" + (activateOnStartup ? "enabled" : "disabled") + "-16.png"),
        "32": data.url("icons/" + (activateOnStartup ? "enabled" : "disabled") + "-32.png"),
        "64": data.url("icons/" + (activateOnStartup ? "enabled" : "disabled") + "-64.png")
    },
    onChange: togglePanel
});

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

var owlHotKey = Hotkey({
    combo: "alt-shift-d",
    onPress: function() {
        owlMode = !owlMode;
        setOwl(owlMode);
  }
});

panel.on("show", function() {
    panel.port.emit("tab_config", {
        mode: owlMode,
        classic: (indexInArray(getDomainFromUrl(tabs.activeTab.url), classicSiteList) > -1),
        whitelist: (indexInArray(getDomainFromUrl(tabs.activeTab.url), whiteSites) > -1)
    });
});

panel.port.on("toggle_owl", function(payload) {
    owlMode = payload.value;
    setOwl(owlMode);
});

panel.port.on("use_classic_theme", function(payload) {
    var host = getDomainFromUrl(tabs.activeTab.url);
    if (host.length > 0) {
        var index = indexInArray(host, classicSiteList);
        if (payload.value) {
            if (index == -1) {
                classicSiteList.push(host);
                ss.storage.classicSiteList = classicSiteList;
                detach(invertStyle, tabs.activeTab);
                attach(classicStyle, tabs.activeTab);
            }
        } else {
            classicSiteList.splice(index, 1);
            ss.storage.classicSiteList = classicSiteList;
            detach(classicStyle, tabs.activeTab);
            attach(invertStyle, tabs.activeTab);
        }
    }
    setOwl(false);
    setOwl(owlMode);
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
    setOwl(false);
    setOwl(owlMode);
});

/* Turn on Owl if startup preference set */
if (activateOnStartup) {
    owlMode = true;
    setOwl(owlMode);
}

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

};

function togglePanel(state) {
    if (state.checked) {
            panel.show({
            position: owlButton
        });
    }
};

function getStyleForUrl(tabUrl) {
    /* Check if site is whitelisted */
    for (var j = 0; j < whiteSites.length; j++)
        if (tabUrl.indexOf(whiteSites[j]) > -1)
            return "no_style";

    /* Default for all websites is invertStyle */
    var tabStyle = invertStyle;

    /* Check if site is known breaking site */
    for (var j = 0; j < breakingSiteRoots.length; j++)
        if (tabUrl.indexOf(breakingSiteRoots[j]) > -1)
            tabStyle = classicStyle;

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
        if (owlMode)
            attach(tabStyle, tab);
        else
            detach(tabStyle, tab);
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

function openTestSites() {
    var testSites = [
        "techcrunch.com",
        "gizmodo.com",
        "engadget.com",
        "facebook.com",
        "www.google.com/search?tbm=isch&q=star+wars",
        "stackoverflow.com/questions/26222367/how-to-change-excluded-urls-in-mozilla-sdk-page-mod-dynamically",
        "accounts.google.com"
    ]

    for (let i = 0; i < testSites.length; i++)
        tabs.open("http://" + testSites[i]);
};

setTabListeners();
//openTestSites();

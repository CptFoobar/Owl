const DEFAULT_CLASSICS = ["techcrunch.com", "amazon.ca", "tomshardware.com",
    "pcpartpicker.com", "ebay.ca", "ebay.in"
];

const INVERT_STYLE_FILE = "data/css/owlInverted.css";
const CLASSIC_STYLE_FILE = "data/css/owlClassic.css";
const CMD_TOGGLE_OWL = "toggle-owl";
const CMD_TOGGLE_CLASSIC = "toggle-classic";

var owlMode = false;
var activateOnStartup = false;
var alwaysClassic = false;
var invertPdf = true;
var owlMode = activateOnStartup;
var allowIncognito = true;
var defaultStyle = alwaysClassic ? CLASSIC_STYLE_FILE : INVERT_STYLE_FILE;
var localFiles = false;
var classicHotkeyShortcut = 'C';
var owlHotkeyShortcut = 'D';
/* Site configuration lists */
// var alwaysDisableSites = ss.storage.whiteSites || [];
// var alwaysEnableSites = ss.storage.alwaysEnableSites || [];
// Set techcrunch.com as default classic
// var classicSiteList = ss.storage.classicSiteList || DEFAULT_CLASSICS;

browser.storage.local.get().then((settings) => {
    // reset storage if nothing is stored so far
    if (!settings || (Object.keys(settings).length === 0 && settings.constructor === Object)) {
        resetStorage();
    } else {
        owlMode = settings.owlOnStartup;
        activateOnStartup = settings.owlOnStartup;
        alwaysClassic = settings.alwaysClassic;
        invertPdf = settings.invertPdf;
        owlMode = activateOnStartup;
        allowIncognito = settings.allowIncognito;
        defaultStyle = alwaysClassic ? CLASSIC_STYLE_FILE : INVERT_STYLE_FILE;
        localFiles = settings.localFiles;
        classicHotkeyShortcut = settings.classicHotkeyCharacter;
        owlHotkeyShortcut = settings.owlHotkeyCharacter;
        /* Site configuration lists */
        // alwaysDisableSites = ss.storage.whiteSites || [];
        // alwaysEnableSites = ss.storage.alwaysEnableSites || [];
        // Set default classic
        // classicSiteList = ss.storage.classicSiteList || DEFAULT_CLASSICS;
    }
}, logError);

var owlButton = browser.browserAction;
var owlPageAction = browser.pageAction;

owlButton.onClicked.addListener((tab) => {
    owlMode = !owlMode;
    setOwl(owlMode);
});

// Add listener to add/remove Owl CSS on new tabs
browser.tabs.onCreated.addListener(tabOpenListener);
browser.tabs.onUpdated.addListener(tabOpenListener);
browser.commands.onCommand.addListener(commandHandler);

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
    console.log(`Setting Owl: ${oMode}`);
    // Set icon and button label
    owlButton.setIcon({ "path": iconSet(oMode) });
    owlButton.setTitle({ "title": "Owl is " + (oMode ? "enabled" : "disabled") });
    // Apply/Remove Owl CSS and show/hide pageAction to all current tabs
    var allTabs = browser.tabs.query({});
    allTabs.then((tabs) => { setOwlOnTabs(tabs, oMode) }, logError);

    console.log(browser.runtime.id);
}

function setOwlOnTabs(tabs, oMode) {
    for (let tab of tabs) {
        console.log(tabs);
        var cssConfig = {
            file: getStyleFileForUrl(tab.url),
            runAt: "document_start"
        };
        var cssOperation = null;
        if (oMode)
            cssOperation = browser.tabs.insertCSS(tab.id, cssConfig);
        else
            cssOperation = browser.tabs.removeCSS(tab.id, cssConfig);
        cssOperation.then(null, logError);
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

function getStyleFileForUrl(tabUrl) {
    /* Check if file is local file */
    // if (tabUrl.indexOf("file://") > -1 && !localFiles)
    //     return "no_style";

    /* Check if site is whitelisted */
    // for (var j = 0; j < alwaysDisableSites.length; j++)
    //     if (tabUrl.indexOf(alwaysDisableSites[j]) > -1)
    //         return "no_style";

    /* Default for all websites is defaultStyle */
    var tabStyle = INVERT_STYLE_FILE;

    /* Check if user has selected classic theme for given site */
    // for (var j = 0; j < classicSiteList.length; j++)
    //     if (tabUrl.indexOf(classicSiteList[j]) > -1)
    //         tabStyle = CLASSIC_STYLE_FILE;

    return tabStyle;
}

function commandHandler(command) {
    if (command == CMD_TOGGLE_OWL) {
        owlMode = !owlMode;
        setOwl(owlMode);
    }
}

function resetStorage() {
    browser.storage.local.set({
        owlOnStartup: false,
        alwaysClassic: false,
        invertPdf: true,
        invertLocalFiles: false,
        allowIncognito: true,
        owlHotkeyCharacter: 'D',
        classicHotkeyCharacter: 'C'
    });
}

function logError(error) {
    console.log(`Error: ${error}`);
}

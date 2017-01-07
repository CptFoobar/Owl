const DEFAULT_CLASSICS = ["techcrunch.com", "amazon.ca", "tomshardware.com",
    "pcpartpicker.com", "ebay.ca", "ebay.in"
];

const INVERT_STYLE_FILE = "data/css/owlInverted.css";
const CLASSIC_STYLE_FILE = "data/css/owlClassic.css";


var owlMode = false;
var owlButton = browser.browserAction;

owlButton.onClicked.addListener((tab) => {
    console.log("toggleing");
    owlMode = !owlMode;
    setOwl(owlMode);
});

// Add listener to add/remove Owl CSS on new tabs
browser.tabs.onCreated.addListener(tabOpenListener);
browser.tabs.onUpdated.addListener(tabOpenListener);

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
    console.log("setting: " + oMode);
    // Set icon and button label
    owlButton.setIcon({"path": iconSet(oMode)});
    owlButton.setTitle({"title" : "Owl is " + (oMode ? "enabled" : "disabled") });
    // Apply/Remove Owl CSS and show/hide pageAction to all current tabs
    var allTabs = browser.tabs.query({});
    allTabs.then((tabs) => { setOwlOnTabs(tabs, oMode); }, logError);
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
            browser.pageAction.show(tab.id);
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
        gettingTab.then((tab) => {
            setOwlOnTabs([tab], owlMode);
        }, logError);
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

function logError(error) {
  console.log(`Error: ${error}`);
}

const { Cc, Ci } = require("chrome"),
  nsIIOService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService),
  nsIStyleSheetService = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);

const DataUrl = require("sdk/self").data.url,
  Self = require("sdk/self"),
  System = require("sdk/system"),
  Tabs = require("sdk/tabs"),
  ToggleButton = require("sdk/ui/button/toggle").ToggleButton;

const owlTheme = nsIIOService.newURI(DataUrl("owlTheme.css"), null, null);
const owlOnString = "Own Mode On";
const owlOffString = "Owl Mode Off";
var owlMode = false;

const applyTheme = function() {
  if (!nsIStyleSheetService.sheetRegistered(owlTheme, nsIStyleSheetService.USER_SHEET)) {
    nsIStyleSheetService.loadAndRegisterSheet(owlTheme, nsIStyleSheetService.USER_SHEET);
  }
}

const removeTheme = function() {
  if (nsIStyleSheetService.sheetRegistered(owlTheme, nsIStyleSheetService.USER_SHEET)) {
    nsIStyleSheetService.unregisterSheet(owlTheme, nsIStyleSheetService.USER_SHEET);
  }
}

const owlOn = function() {
  owlButton.checked = true;
  owlButton.label = owlOnString;
  owlButton.icon = DataUrl("icons/enabled-32.png");
  applyTheme();
}

const owlOff = function() {
  owlButton.checked = false;
  owlButton.label = owlOffString;
  owlButton.icon = DataUrl("icons/disabled-32.png");
  removeTheme();
}


var owlButton = ToggleButton({
    id: "owl-button",
    label: owlOffString,
    icon: {
      "16": DataUrl("icons/disabled-16.png"),
      "32": DataUrl("icons/disabled-32.png"),
      "64": DataUrl("icons/disabled-64.png")
    },
    onChange: function() {
      this.state('window', null);
      this.checked = !this.checked;
      toggleOwlMode();
  }
});

const toggleOwlMode = function(){
  if (owlMode) {
      owlMode = false;
      owlOff();
  } else {
      owlMode = true;
      owlOn();
  }
};



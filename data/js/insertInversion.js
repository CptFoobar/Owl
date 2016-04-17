(function() {
    var INVERT_STYLE ='' +
    '@media screen {' +
    '  html {' +
    '      filter: invert(95%) hue-rotate(180deg) brightness(110%) contrast(90%) !important;' +
    '      overflow: auto;' +
    '  }' +
    '  img, iframe, video, *:not(object):not(body)>embed, object, *[style*="background:url"]:empty, *[style*="background-image:url"]:empty, *[style*="background: url"]:empty, *[style*="background-image: url"]:empty {' +
    '      filter: brightness(95%) invert(105%) hue-rotate(180deg) !important;' +
    '  }' +
    '  .irc_bg {' +
    '      background-color: #2b2b2b;' +
    '  }' +
    '  :-moz-full-screen * {' +
    '      filter: none !important;' +
    '  }' +
    '  html {' +
    '      background: rgb(30, 30, 30) !important;' +
    '      min-height: 100%;' +
    '  }' +
    '  /* Google images image preview banner */' +
    '  #irc_cc {' +
    '      background-color: #dfdfdf;' +
    '  }' +
    '  .irc_pt, ._Hcb{' +
    '      color: #383838;' +
    '  }' +
    '  /* Google homepage user image */' +
    '  .gb_b.gb_4a.gb_R {' +
    '      filter: brightness(90%) invert(95%) hue-rotate(180deg) !important;' +
    '  }' +
    '  /* Google Inbox icons fix */' +
    '  .pE, .HH{' +
    '      filter: brightness(90%) invert(95%) hue-rotate(180deg) !important;' +
    '  }' +
    '  .du.ew, div.l9 > div:not(.I7) {' +
    '      filter: invert(95%);' +
    '  }' +
    '  /* Yahoo navigation fix */' +
    '  .Row.Pend-10 {' +
    '      background: #f9f9f9 !important;' +
    '  }' +
    '} ';

    var owlStyle = document.createElement("style");
    owlStyle.id = "owl-css";
    owlStyle.type = "text/css";
    owlStyle.textContent = INVERT_STYLE;
    document.head.appendChild(owlStyle)

}());

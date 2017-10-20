(function() {
    console.log("Sending message from page");
    browser.runtime.sendMessage({
        intent: "getSiteSettings"
    });
    browser.runtime.onMessage.addListener(messageHandler);

    function messageHandler(message) {
        //console.log("sites", message);
        switch (message.intent) {
            case "siteSettings":
                $(function() {
                    for (var i = 0; i < message.payload.whitelistSites.length; i++)
                        $("#whitelist_sites").append(getEntryForUrl(message.payload.whitelistSites[i]));

                    for (var i = 0; i < message.payload.classicSites.length; i++)
                        $("#classic_sites").append(getEntryForUrl(message.payload.classicSites[i]));

					for (var i = 0; i < message.payload.highContrastSites.length; i++)
                        $("#high_contrast_sites").append(getEntryForUrl(message.payload.highContrastSites[i]));

                    for (var i = 0; i < message.payload.alwaysEnableSites.length; i++)
                        $("#always_enable_sites").append(getEntryForUrl(message.payload.alwaysEnableSites[i]));

                    checkEmptyLists();

                    $(".btn-remove-site").click(function(event) {
                        var sibling = $(event.target).siblings()[0];
                        var intent = getRemoveIntent($(sibling).parent().parent()[0].id)
                        browser.runtime.sendMessage({
                            intent: intent,
                            site: $.trim($(sibling).text())
                        });
                        $(sibling).parent().remove();
                        checkEmptyLists();
                    });
                });
        }
    }

    function getEntryForUrl(url) {
        return $('<li class="list-group-item" >' +
                    '<a href="http://' + url + '">' + url + '</a>' +
                    '<span class="btn btn-lg btn-danger btn-remove-site">' +
                        // HTML Unicode for thick 'X'
                        '&#10006;' +
                    '</span>' +
                '</li>');
    };

    function checkEmptyLists() {
        if ($("#whitelist_sites").children().length === 0)
            $("#whitelist_sites").append(
                    '<li class="list-group-item text-center no_sites">' +
                        'No sites are whitelisted.' +
                    '</li>');
        if ($("#classic_sites").children().length === 0)
            $("#classic_sites").append(
                    '<li class="list-group-item text-center no_sites">' +
                        'No sites are set to use Classic Theme.' +
                    '</li>');
        if ($("#high_contrast_sites").children().length === 0)
            $("#high_contrast_sites").append(
                    '<li class="list-group-item text-center no_sites">' +
                        'No sites are set to use High Contrast Theme.' +
                    '</li>');
        if ($("#always_enable_sites").children().length === 0)
            $("#always_enable_sites").append(
                    '<li class="list-group-item text-center no_sites">' +
                        'No sites are set to enable Owl always.' +
                    '</li>');
    }

    function getRemoveIntent(id) {
        if (id == "classic_sites")    return "deleteClassicSite";
        else if (id == "always_enable_sites")   return "deleteEnabledSite";
        else return "deleteWhitelistSite";
    }

}());

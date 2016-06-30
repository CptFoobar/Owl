(function () {
    window.addEventListener('message', function(event) {
        var message = JSON.parse(JSON.stringify(event.data));
        if (message.target && message.target == "OwlFront" && message.intent == "configuredSites") {
            $(function() {
                for (var i = 0; i < message.payload.whitelistSites.length; i++)
                    $("#whitelist_sites").append(getEntryForUrl(message.payload.whitelistSites[i]));

                for (var i = 0; i < message.payload.classicSites.length; i++)
                    $("#classic_sites").append(getEntryForUrl(message.payload.classicSites[i]));

                for (var i = 0; i < message.payload.alwaysEnableSites.length; i++)
                    $("#always_enable_sites").append(getEntryForUrl(message.payload.alwaysEnableSites[i]));

                checkEmptyLists();

                $(".btn-remove-site").click(function(event) {
                    var sibling = $(event.target).siblings()[0];
                    var intent = getRemoveIntent($(sibling).parent().parent()[0].id)
                    window.postMessage({
                        target: "OwlBase",
                        intent: intent,
                        payload: { site: $.trim($(sibling).text()) }
                    }, "resource://owl-comfortable-reading-addon/data/markup/configure_sites.html");
                    $(sibling).parent().remove();
                    checkEmptyLists();
                });
            });
        }
    }, false);

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
        if ($("#always_enable_sites").children().length === 0)
            $("#always_enable_sites").append(
                    '<li class="list-group-item text-center no_sites">' +
                        'No sites are always enabled.' +
                    '</li>');
    }

    function getRemoveIntent(id) {
        if (id == "classic_sites")    return "deleteClassicSite";
        else if (id == "always_enable_sites")   return "deleteEnabledSite";
        else return "deleteWhitelistSite";
    }

}());

(function() {
    self.port.on("configuredSites", function(configSites) {
        window.postMessage({
            target: "OwlFront",
            intent: "configuredSites",
            payload: configSites
        }, "resource://owl-comfortable-reading-addon/data/markup/configure_sites.html");
    });

    window.addEventListener('message', function(event) {
        var message = JSON.parse(JSON.stringify(event.data));
        if (message.target && message.target == "OwlBase") {
            self.port.emit(message.intent, message.payload);
        }
    }, false);

}());

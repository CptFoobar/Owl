(function() {
    $(function() {
        self.port.on("tab_config", function(config) {
            $("#toggle_event").bootstrapToggle(config.mode ? "on" : "off");
            $("#disable_here").prop("checked", config.whitelist);
            $("#use_classic").prop("checked", config.classic);
            $("#disable_here").prop("disabled", !config.mode);
            $("#use_classic").prop("disabled", config.whitelist || !config.mode);
            $(".site_options").css("color", config.mode ? "#333" : "#6E6E6E");
        });
        /* Toggle Switch for Owl */
        $("#toggle_event").change(function() {
            self.port.emit("toggle_owl", { value: this.checked });
            $("#disable_here").prop("disabled", !this.checked);
            $("#use_classic").prop("disabled", !this.checked);
            $(".site_options").css("color", this.checked ? "#333" : "#6E6E6E");
        });

        /* Message add-on to mark this website as Classic */
        $("#use_classic").change(function() {
            self.port.emit("use_classic_theme", { value: this.checked });
        });

        /* Message add-on to whitelist this website */
        $("#disable_here").change(function() {
            self.port.emit("disable_website",  { value: this.checked });
            $("#use_classic").prop("disabled", this.checked);
            $("#use_classic_text").css("color", this.checked ? "#333" : "#6E6E6E");
        });
    });
}());

// Panel is a difference window!!

(function() {
    $(function() {
        browser.runtime.sendMessage({
            intent: "getTabConfig"
        });
        browser.runtime.onMessage.addListener(messageHandler);
        var uiUpdateLock = false;
        function messageHandler(message) {
            //console.log("panel", message);
            switch (message.intent) {
                case "tabConfig":
                    uiUpdateLock = true;
                    updatePanelUi(message);
                    uiUpdateLock = false;
                    break;
            }
        }

        $('[data-toggle="tooltip"]').tooltip();

        function updatePanelUi(config) {
            $("#toggle_owl").bootstrapToggle((config.mode ? "on" : "off"));
            $("#disable_here").bootstrapToggle((config.alwaysDisable ? "on" : "off"));
            $("#use_classic").bootstrapToggle(((config.classic || config.alwaysClassic) ? "on" : "off"));
            $("#always_enable_here").bootstrapToggle((config.alwaysEnable ? "on" : "off"));
            $("#use_high_contrast").bootstrapToggle(((config.alwaysHC || config.highContrast) ? "on" : "off"));

            if (config.alwaysDisable || config.alwaysClassic || !config.mode) {
                $("#use_classic").bootstrapToggle("disable");
                $("#use_classic_text").css("color", "#6E6E6E");
            } else {
                $("#use_classic").bootstrapToggle("enable");
                $("#use_classic_text").css("color", "#333");
            }
            if (config.alwaysDisable || config.alwaysHC || !config.mode) {
                $("#use_high_contrast").bootstrapToggle("disable");
                $("#high_contrast_text").css("color", "#6E6E6E");
            } else {
                $("#use_high_contrast").bootstrapToggle("enable");
                $("#high_contrast_text").css("color", "#333");
            }
            if (config.alwaysEnable || !config.mode) {
                $("#disable_here").bootstrapToggle("disable");
                $("#disable_here_text").css("color", "#6E6E6E");
            } else {
                $("#disable_here").bootstrapToggle("enable");
                $("#disable_here_text").css("color", "#333");
            }
            if (config.alwaysDisable) {
                $("#always_enable_here").bootstrapToggle("disable");
                $("#always_enable_text").css("color", "#6E6E6E");
            } else {
                $("#always_enable_here").bootstrapToggle("enable");
                $("#always_enable_text").css("color", "#333");
            }
        }

        /* Toggle Switch for Owl */
        $("#toggle_owl").change(function() {
            if (!uiUpdateLock) {
                var checked = $(this).prop('checked');
                browser.runtime.sendMessage({
                    intent: "toggleOwl",
                    value: checked
                });
                var status = (checked ? "enable" : "disable");
                $('#use_classic').bootstrapToggle(status);
                $('#use_high_contrast').bootstrapToggle(status);
                $('#disable_here').bootstrapToggle(status);

                $("#use_classic_text").css("color", (checked ? "#333" : "#6E6E6E"));
                $("#high_contrast_text").css("color", (checked ? "#333" : "#6E6E6E"));
                $("#disable_here_text").css("color", (checked ? "#333" : "#6E6E6E"));
                $("#always_enable_text").css("color", (checked ? "#333" : "#6E6E6E"));
            }
        });

        /* Message add-on to mark this website as Classic */
        $("#use_classic").change(function() {
            if (!uiUpdateLock)
                browser.runtime.sendMessage({
                    intent: "useClassicTheme",
                    value: $(this).prop('checked')
                });
        });

        /* Message add-on to mark this website as High Contrast */
        $("#use_high_contrast").change(function() {
            if (!uiUpdateLock)
                browser.runtime.sendMessage({
                    intent: "useHighContrast",
                    value: $(this).prop('checked')
                });
        });

        /* Message add-on to always Disable on this website */
        $("#disable_here").change(function() {
            if (!uiUpdateLock) {
                var checked = $(this).prop('checked');
                browser.runtime.sendMessage({
                    intent: "disableWebsite",
                    value: checked
                });
                $('#use_classic').bootstrapToggle(((checked && !$("#toggle_owl").prop("checked")) ? "disable" : "enable"));
                $('#use_high_contrast').bootstrapToggle(((checked && !$("#toggle_owl").prop("checked")) ? "disable" : "enable"));
                $('#always_enable_here').bootstrapToggle((checked ? "disable" : "enable"));
                $("#use_classic_text").css("color", ((checked && $("#toggle_owl").prop("checked")) ? "#6E6E6E" : "#333"));
                $("#high_contrast_text").css("color", ((checked && $("#toggle_owl").prop("checked")) ? "#6E6E6E" : "#333"));
                $("#always_enable_text").css("color", ((checked && $("#toggle_owl").prop("checked")) ? "#6E6E6E" : "#333"));
            }
        });

        /* Message add-on to always Enable on this website */
        $("#always_enable_here").change(function() {
            if (!uiUpdateLock) {
                var checked = $(this).prop('checked');
                browser.runtime.sendMessage({
                    intent: "alwaysEnableWebsite",
                    value: checked
                });
                $('#disable_here').bootstrapToggle((checked ? "disable" : "enable"));
                $("#disable_here_text").css("color", (checked ? "#6E6E6E" : "#333"));
            }
        });

        $("#open_site_settings").click(function() {
            browser.tabs.create({ url: "configure_sites.html" });
        });

    });
}());

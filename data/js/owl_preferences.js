(function() {
    $(function() {
        let STORAGE = browser.storage.local;
        const DEFAULT_CONFIG = {
            owlOnStartup: false,
            alwaysClassic: false,
            invertPdf: true,
            invertLocalFiles: false,
            allowIncognito: true,
            owlHotkeyCharacter: 'D',
            classicHotkeyCharacter: 'C'
        };

        STORAGE.get().then(updateUIConfig, setDefaultConfig);
        var sendConfigBroadcast = false;

        function updateUIConfig(userData) {
            //console.log("[OWL] data: ", JSON.stringify(userData));
            sendConfigBroadcast = false;
            for (let checkboxId of ["owlOnStartup", "alwaysClassic", "invertPdf", "invertLocalFiles", "allowIncognito"]) {
                $("#" + checkboxId).prop('checked', userData[checkboxId]);
            }
            $("#owlHotkeyCharacter").val(userData.owlHotkeyCharacter);
            $("#classicHotkeyCharacter").val(userData.classicHotkeyCharacter);
            sendConfigBroadcast = true;
        }

        function setDefaultConfig() {
            sendConfigBroadcast = false;
            for (let checkboxId of ["owlOnStartup", "alwaysClassic", "invertPdf", "invertLocalFiles", "allowIncognito"]) {
                $("#" + checkboxId).prop('checked', DEFAULT_CONFIG[checkboxId]);
            }
            $("#owlHotkeyCharacter").val(DEFAULT_CONFIG.owlHotkeyCharacter);
            $("#classicHotkeyCharacter").val(DEFAULT_CONFIG.classicHotkeyCharacter);
            sendConfigBroadcast = true;
        }

        $("input[type='checkbox']").change(function() {
            var id = $(this).attr("id");
            STORAGE.set({[id]: $(this).is(":checked")}).then(() => {
                browser.runtime.sendMessage({
                    intent: "prefUpdate",
                    prefName: id,
                    prefValue: $(this).is(":checked")
                });
            }, (e) => { console.log(e); });
        });

        $("#openSiteConfig").click(function() {
            browser.tabs.create({
                url: "configure_sites.html"
            });
        });

    });
}());

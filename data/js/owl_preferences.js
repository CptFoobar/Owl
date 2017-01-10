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

    function updateUIConfig(userData) {
        for (let checkboxId of ["owlOnStartup", "alwaysClassic", "invertPdf", "invertLocalFiles", "allowIncognito"]) {
            $("#" + checkboxId).prop('checked', userData[checkboxId]);
        }
        $("#owlHotkeyCharacter").val(userData.owlHotkeyCharacter);
        $("#classicHotkeyCharacter").val(userData.classicHotkeyCharacter);
    }

    function setDefaultConfig() {
        for (let checkboxId of ["owlOnStartup", "alwaysClassic", "invertPdf", "invertLocalFiles", "allowIncognito"]) {
            $("#" + checkboxId).prop('checked', DEFAULT_CONFIG[checkboxId]);
        }
        $("#owlHotkeyCharacter").val(DEFAULT_CONFIG.owlHotkeyCharacter);
        $("#classicHotkeyCharacter").val(DEFAULT_CONFIG.classicHotkeyCharacter);
    }

    $("input[type='checkbox']").change(function() {
        var id = $(this).attr("id");
        STORAGE.set({[id]: $(this).is(":checked")}).then(null, (e) => { console.log(e); });
    });

    $("select").change(function() {
        var id = $(this).attr("id");
        STORAGE.set({[id]: $(this).val()}).then(null, (e) => { console.log(e); });
    });

    $("#openSiteConfig").click(function() {
        window.open("configure_sites.html", "_blank");
    });

});

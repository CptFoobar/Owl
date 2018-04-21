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
        const saveDataToFile = function(data, fileName, properties) {
            window.URL = window.URL || window.webkitURL;
            var file = new File(data, fileName, properties),
              link = document.createElement('a');
            link.href = window.URL.createObjectURL(file);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(link.href);// possible problem here
            document.body.removeChild(link)
          };
        //create on click listener for export setting button
        $("#exportSettings").click(function() {
        
            browser.storage.local.get().then((settings) => {
                // reset storage if nothing is stored so far
                if (!settings || (Object.keys(settings).length === 0 && settings.constructor === Object)) {
                    resetStorage();
                } else {
                    const fileName = 'owl_settings.json',
                    properties = {
                    type: 'octet/stream'
                    },
                    data = [JSON.stringify({
                        whiteSites:settings.whiteSites,
                        alwaysEnableSites:settings.alwaysEnableSites,
                        classicSiteList:settings.classicSiteList
                    })];
                    saveDataToFile(data, fileName, properties);
                    console.log('save')
                }
                
            }, (err)=>{
                console.log(err)
            });
        
            
        });

        $("#importSettings").change(function(event){
            const filesList = event.target.files;
            //console.log('print this',filesList[0])
            if(filesList.length===1){
                const file = filesList[0]
                console.log(file)
                readJSON(file)

            }
        })


        function readJSON(file) {
            const reader = new FileReader();      
            reader.onload = function(e) {
              let text = JSON.parse(e.target.result);
              console.log(text.whiteSites)
            }
            reader.onerror = function(err) {
              console.log(
                  err, 
                  err.loaded, 
                  err.loaded === 0, 
                  file);
            }
  
            reader.readAsText(file);
        }

    });
}());

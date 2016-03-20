(function() {
    function getURLParameter(sParam) {
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        for (var i = 0; i < sURLVariables.length; i++) {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] == sParam) {
                return sParameterName[1];
            }
        }
    }
    if (getURLParameter("update") == "y") {
        document.getElementById("whats-new").style.display = "block";
    } else {
        document.getElementById("whats-new").style.display = "none";
    }
}());

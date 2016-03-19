(function() {
    $(function() {
        /* Toggle Switch for Owl */
        $("#send_love_now").click(function() {
            self.port.emit("show_support_link", null);
        });

        /* Message add-on to mark this website as Classic */
        $("#never_love_again").change(function() {
            self.port.emit("never_remind_again", null);
        });
    });
}());

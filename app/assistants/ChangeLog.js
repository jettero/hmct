function ChangeLogAssistant() {
    Mojo.Log.info("ChangeLog()");
}

ChangeLogAssistant.prototype.setup = function() {
    var child;
    try {
        Mojo.Log.info("ChangeLog() isChildWindow=%s", Mojo.Controller.isChildWindow() ? "yeah" : "nah");

    } catch(e) {
        Mojo.Log.info("ChangeLog() isChildWindow=who-knows: %s", e);
    }
};

Mojo.Log.info('loaded(ChangeLog.js)');

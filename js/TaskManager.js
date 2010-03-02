
function TaskManager() {
    Mojo.Log.info("TaskManager()");

    Mojo.Log.info("test-md5: %s, %s", hex_md5(""), hex_md5("abc"));

    this.handleLoginChange = this.handleLoginChange.bind(this);
    this.currentSearch = "accepted but first nothing not complete due before 7 days from now hidden until before tomorrow not hidden forever";

    AMO.registerLoginChange(this.handleLoginChange);
}

TaskManager.prototype.handleLoginChange = function(emails,current) {
    Mojo.Log.info("TaskManager::handleLoginChange(current=%s)", current);

};

TaskManager.prototype.dbChanged = function(desc) {
    Mojo.Log.info("TaskManager::dbChanged(desc=%s)", desc);
};

TaskManager.prototype.searchTasks = function() {
    Mojo.Log.info("TaskManager::searchTasks()");

    var request = new Ajax.Request('http://hiveminder.com/=/action/DownloadTasks.json', {
        method:     'post',
        parameters: {format: "json", query: this.currentSearch.replace(/\s+/g, "/")},
        evalJSON:   true,

        onSuccess: function(transport) {
            if( transport.status == 200 ) {
                var r = transport.responseJSON;
                if( r ) {
                    if( r.success ) {
                        Mojo.Log.info("TaskManager::searchTasks() r.success r=%s", Object.toJSON(r));
                        this.data.tasks = r;
                        this.dbChanged("fetched tasks");

                    } else {
                        Mojo.Log.info("TaskManager::searchTasks() r.fail, r=%s", Object.toJSON(r));
                        var e = [];

                        if( r.error )
                            e.push($L(r.error));

                        for(var k in r.field_errors )
                            e.push($L(k + "-error: " + r.field_errors[k]));

                        if( !e.length )
                            e.push($L("Something went wrong with the task search ..."));

                        if( f(e) )
                            Mojo.Controller.errorDialog(e.join("... "));
                    }

                } else {
                    Mojo.Log.info("TaskManager::searchTasks() sent [kinda bad]: r=%s", Object.toJSON(r));
                    var e = ["Unknown error searching hiveminder tasks, huh"];

                    if( f(e) )
                        Mojo.Controller.errorDialog(e.join("... "));
                }

            } else {
                Mojo.Log.info("TaskManager::searchTasks() sent [kinda bad]: transport=%s", Object.toJSON(transport));
                var e = ["Unknown error searching hiveminder tasks -- host not found?"];

                if( f(e) )
                    Mojo.Controller.errorDialog(e.join("... "));
            }

        }.bind(this),

        onFailure: function(transport) {
            var t = new Template($L("Ajax Error: #{status}"));
            var m = t.evaluate(transport);
            var e = [m];

            if( f(e) )
                Mojo.Controller.errorDialog(e.join("... "));

        }.bind(this)

    });

};

Mojo.Log.info('loaded(TaskManager.js)');

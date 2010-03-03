
/* {{{ /**/ function TaskManager() {
    Mojo.Log.info("TaskManager()");

    Mojo.Log.info("test-md5: %s, %s", hex_md5(""), hex_md5("abc"));

    this.handleLoginChange = this.handleLoginChange.bind(this);
    this.currentSearch = "accepted but first nothing not complete due before 7 days from now hidden until before tomorrow not hidden forever";

    AMO.registerLoginChange(this.handleLoginChange);

    this.loaded = 0;
    this.cacheInit();
    this.dbRestore();
}

/*}}}*/

/* {{{ /**/ TaskManager.prototype.handleLoginChange = function(emails,current) {
    Mojo.Log.info("TaskManager::handleLoginChange(current=%s)", current);

    // if( current )
    //     this.searchTasks(); // cool, there's a login set, search now!!

};

/*}}}*/
/* {{{ /**/ TaskManager.prototype.activate = function() {
    // TODO: load/reload tasks here if there's a current login set
    // this.searchTasks();
};

/*}}}*/

/* {{{ /**/ TaskManager.prototype.searchTasks = function(force) {
    Mojo.Log.info("TaskManager::searchTasks()");

    if( !force ) {
        Mojo.Log.info("TaskManager::searchTasks() checking cache");

        // TODO: check cache here
    }

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

/*}}}*/

/* {{{ /**/ TaskManager.prototype.dbSent = function() {
    Mojo.Log.info("TaskManager::dbSent()");
};

/*}}}*/
/* {{{ /**/ TaskManager.prototype.dbSentFail = function(transaction, error) {
    Mojo.Log.info("TaskManager::dbSentFail()");
    Mojo.Controller.errorDialog("ERROR storing cache information (#" + error.message + ").");

    this.cacheInit();
    this.dbo.removeAll(this.dbSent, this.dbSentFail);
};

/*}}}*/

/* {{{ /**/ TaskManager.prototype.dbRecv = function(data) {
    Mojo.Log.info("TaskManager::dbRecv()");

    this.db_loaded = true;
    Mojo.Log.info("TMO.loaded=true");

    if( data === null )
        data = {};

    switch( data.version ) {
        default:
            this.data = data;
            break;
    }

    for( var k in this.data.cache )
        Mojo.Log.info("restored cache: %s [%d]", k, this.data.cache[k].expire);

    this.checkCache();
};

/*}}}*/
/* {{{ /**/ TaskManager.prototype.dbRecvFail = function(transaction, error) {
    Mojo.Log.info("TaskManager::dbRecvFail()");
    Mojo.Controller.errorDialog("ERROR restoring account information (#" + error.message + ").");

};

/*}}}*/
/* {{{ /**/ TaskManager.prototype.dbRestore = function() {
    Mojo.Log.info("TaskManager::dbRestore()");
    this.dbo.get("tm_data", this.dbRecv, this.dbRecvFail);

};

/*}}}*/

/* {{{ /**/ TaskManager.prototype.cacheInit() {
    Mojo.Log.info("TaskManager::cacheInit()");

    this.data = { version: 1, cache: {} };
}

/*}}}*/
/* {{{ /**/ TaskManager.prototype.setCache = function(key,data) {
    Mojo.Log.info("TaskManager::setCache(key=%s)", key);

    var now = Math.round(new Date().getTime()/1000.0);

    this.data.cache[key] = { expire: now + 4000 };

    this.dbo.add("tm_data", this.data, this.dbSent, this.dbSentFail);
    this.dbo.add(key,            data, this.dbSent, this.dbSentFail);

    this.checkCache();
};

/*}}}*/
/* {{{ /**/ TaskManager.prototype.checkCache = function() {
    Mojo.Log.info("TaskManager::checkCache()");

    var now = Math.round(new Date().getTime()/1000.0);

    for( var k in this.data.cache ) {
        if( now >= this.data.cache[k].expire ) {
            Mojo.Log.info("%s expired", k);

            this.dbo.remove(k, this.dbSent, this.dbSentFail)
        }
    }

}

Mojo.Log.info('loaded(TaskManager.js)');

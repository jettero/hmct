/*jslint white: false, onevar: false
*/
/*global Mojo $L hex_md5 AMO Ajax Template
*/

/* {{{ */ function TaskManager() {
    Mojo.Log.info("TaskManager()");

    var options = {
        name:    "HMCTTasks",
        version: 1,
        replace: false // opening existing if possible
    };

    this.dbo = new Mojo.Depot(options, function(){}, function(t,r){
        Mojo.Controller.errorDialog("Can't open location database (#" + r.message + ").");
    });

    this.dbRecv     = this.dbRecv.bind(this);
    this.dbRecvFail = this.dbRecvFail.bind(this);
    this.dbSent     = this.dbSent.bind(this);
    this.dbSentFail = this.dbSentFail.bind(this);

    this.checkCache = this.checkCache.bind(this); // called from setTimeout

    Mojo.Log.info("test-md5: %s, %s", hex_md5(""), hex_md5("abc"));

    this.handleLoginChange = this.handleLoginChange.bind(this);
    this.currentSearch = "accepted but first nothing not complete due before 7 days from now hidden until before tomorrow not hidden forever";

    AMO.registerLoginChange(this.handleLoginChange);

    this.loaded = 0;
    this.cacheInit();
    this.dbRestore();
}

/*}}}*/

/* {{{ */ TaskManager.prototype.handleLoginChange = function(emails,current) {
    Mojo.Log.info("TaskManager::handleLoginChange(current=%s)", current);

    if( current ) {
        this.searchTasks();
        this.searchTasks();
    }

};

/*}}}*/
/* {{{ */ TaskManager.prototype.activate = function() {
    // TODO: load/reload tasks here if there's a current login set
    // this.searchTasks();
};

/*}}}*/

/* {{{ */ TaskManager.prototype.searchTasks = function(force) {
    Mojo.Log.info("TaskManager::searchTasks()");

    if( !force ) {
        Mojo.Log.info("TaskManager::searchTasks() checking cache");

        // TODO: check cache here
    }

    if( this.req ) {
        Mojo.Log.info("TaskManager::searchTasks() [canceling previous request]");

        try {
            this.req.transport.abort();
        }

        catch(e) {
            Mojo.Log.info("TaskManager::searchTasks() [problem canceling previous request: %s]", e);
        }
    }

    this.req = new Ajax.Request('http://hiveminder.com/=/action/DownloadTasks.json', {
        method:     'post',
        parameters: {format: "json", query: this.currentSearch.replace(/\s+/g, "/")},
        evalJSON:   true,

        onSuccess: function(transport) {
            var e = [];

            if( transport.status === 200 ) {
                var r = transport.responseJSON;

                delete this.req;

                if( r ) {
                    if( r.success ) {
                        Mojo.Log.info("TaskManager::searchTasks()::onSuccess() r.success r=%s", Object.toJSON(r));
                        this.data.tasks = r;

                    } else {
                        Mojo.Log.info("TaskManager::searchTasks()::onSuccess() r.fail, r=%s", Object.toJSON(r));

                        if( r.error )
                            e.push($L(r.error));

                        for(var k in r.field_errors )
                            e.push($L(k + "-error: " + r.field_errors[k]));

                        if( !e.length )
                            e.push($L("Something went wrong with the task search ..."));

                        Mojo.Controller.errorDialog(e.join("... "));
                    }

                } else {
                    Mojo.Log.info("TaskManager::searchTasks()::onSuccess() sent [kinda bad]: r=%s", Object.toJSON(r));
                    e = ["Unknown error searching hiveminder tasks, huh"];

                    Mojo.Controller.errorDialog(e.join("... "));
                }

            } else {
                Mojo.Log.info("TaskManager::searchTasks()::onSuccess() sent [kinda bad]: transport=%s", Object.toJSON(transport));
                e = ["Unknown error searching hiveminder tasks -- host not found?"];

                Mojo.Controller.errorDialog(e.join("... "));
            }

        }.bind(this),

        onFailure: function(transport) {
            Mojo.Log.info("TaskManager::searchTasks()::onFailure() transport=%s", Object.toJSON(transport));

            var t = new Template($L("Ajax Error: #{status}"));
            var m = t.evaluate(transport);
            var e = [m];

            Mojo.Controller.errorDialog(e.join("... "));

        }.bind(this)

    });

};

/*}}}*/

/* {{{ */ TaskManager.prototype.dbSent = function() {
    Mojo.Log.info("TaskManager::dbSent()");

    this.db_busy = false;
};

/*}}}*/
/* {{{ */ TaskManager.prototype.dbSentFail = function(transaction, error) {
    Mojo.Log.info("TaskManager::dbSentFail()");
    Mojo.Controller.errorDialog("ERROR storing cache information (#" + error.message + ").  Clearing cache if possible.");

    // Is this an overreaction or downright prudent?  Personally, I hate the
    // idea of the cache db getting corrupted and losing track of huge keys in
    // the Depot...

    var me = this;
    this.dbo.removeAll(function(){ me.cacheInit(); me.db_busy = false; },
        this.dbSentFail); // is it crazy to go around again?  Personally I hope
                          // this comes up infrequently.  in a worst case,
                          // they'll just close the card anyway.
};

/*}}}*/

/* {{{ */ TaskManager.prototype.dbRecv = function(data) {
    Mojo.Log.info("TaskManager::dbRecv()");

    this.loaded = true;
    Mojo.Log.info("TMO.loaded=true");

    if( data === null )
        data = {};

    switch( data.version ) {
        default:
            this.data = data;
            break;
    }

    var now = Math.round(new Date().getTime()/1000.0);

    for( var k in this.data.cache )
        Mojo.Log.info("restored cache: %s [age: %ds]", k, now - this.data.cache[k].entered);

    this.db_busy = false;
    this.checkCache();
};

/*}}}*/
/* {{{ */ TaskManager.prototype.dbRecvFail = function(transaction, error) {
    Mojo.Log.info("TaskManager::dbRecvFail()");
    Mojo.Controller.errorDialog("ERROR restoring account information (#" + error.message + ").");

    // weird... I hope this doesn't come up much.  I don't understand the implications of a db load fail
    // should we clear the cache here? [see dbSentFail for full discussion]

    var me = this;
    this.dbo.removeAll(function(){ me.cacheInit(); me.db_busy = false; },
        this.dbRecvFail); // is it crazy to go around again? [see dbSentFail for full discussion]

};

/*}}}*/
/* {{{ */ TaskManager.prototype.dbRestore = function() {
    Mojo.Log.info("TaskManager::dbRestore()");

    if( this.db_busy ) {
        setTimeout(function() { me.setCache(key,data) }, 500);
        return;
    }

    this.db_busy = true;
    this.dbo.get("tm_data", this.dbRecv, this.dbRecvFail);
};

/*}}}*/

/* {{{ */ TaskManager.prototype.cacheInit = function() {
    Mojo.Log.info("TaskManager::cacheInit()");

    this.data = { version: 1, cache: {} };
};

/*}}}*/
/* {{{ */ TaskManager.prototype.setCache = function(key,data) {
    Mojo.Log.info("TaskManager::setCache(key=%s)", key);

    if( this.db_busy ) {
        Mojo.Log.info("TaskManager::setCache() [busy]");
        var me = this;
        // NOTE: this forms a closure (ie, dynamic lexical binding) over the lambda
        setTimeout(function() { me.setCache(key,data) }, 500);
        return;
    }

    this.db_busy = true;

    var me = this;
    var f1 = function() { me.db_busy = false; /* failed to add key, life goes on */ };
    var s1 = function() {
        var f2 = function() {
            me.dbo.remove(key); /* failed to store meta, remove key */
            me.dbSentFail();
        };

        var now = Math.round(new Date().getTime()/1000.0);
        me.data.cache[key] = { entered: now };
        me.dbo.add("tm_data", this.data, this.dbSent, f2);
    };

    this.dbo.add(key, data, s1, f1); // try to add the key
    this.checkCache(); // won't actually run until db_busy = false
};

/*}}}*/
/* {{{ */ TaskManager.prototype.checkCache = function() {
    Mojo.Log.info("TaskManager::checkCache()");

    var now = Math.round(new Date().getTime()/1000.0);

    if( this.db_busy ) {
        Mojo.Log.info("TaskManager::checkCache() [busy]");
        setTimeout(this.checkCache, 500);
        return;
    }

    this.db_busy = true;

    for( var k in this.data.cache ) {
        if( (now - this.data.cache[k].entered) >= 4000 ) {
            Mojo.Log.info("%s expired", k);

            this.dbo.remove(k, this.dbSent, this.dbSentFail);
        }
    }

    this.db_busy = false;

};

/*}}}*/

Mojo.Log.info('loaded(TaskManager.js)');

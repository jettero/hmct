/*jslint white: false, onevar: false
*/
/*global Mojo $L hex_md5 AMO Ajax Template setTimeout
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
    this.recvCache  = this.recvCache.bind(this);

    this.checkCache = this.checkCache.bind(this); // called from setTimeout
    this.dbRestore  = this.dbRestore.bind(this);  // called from setTimeout

    this.handleLoginChange = this.handleLoginChange.bind(this);

    AMO.registerLoginChange(this.handleLoginChange);

    this.tasksChangeCallback = [];

    this.cardLoaded(false);
    this.dbBusy(false);

    this.cacheInit();
    this.dbRestore();
}

/*}}}*/

/* {{{ */ TaskManager.prototype.handleLoginChange = function(emails,current) {
    Mojo.Log.info("TaskManager::handleLoginChange(current=%s)", current);

    this.currentLogin = current;

    if( current )
        this.searchTasks("accepted but first nothing not complete due before 7 days from now hidden until before tomorrow not hidden forever");

};

/*}}}*/
/* {{{ */ TaskManager.prototype.activate = function() {
    // TODO: load/reload tasks here if there's a current login set
    // this.searchTasks();
};

/*}}}*/

/* {{{ */ TaskManager.prototype.recvCache = function(data) {
    Mojo.Log.info("TaskManager::recvCache()");

    this.dbBusy(false);
    this.tasks = data;
    this.processTasks();
};

/*}}}*/
/* {{{ */ TaskManager.prototype.processTasks = function() {
    Mojo.Log.info("TaskManager::processTasks()");
};

/*}}}*/
/* {{{ */ TaskManager.prototype.searchTasks = function(search,force) {
    Mojo.Log.info("TaskManager::searchTasks(%s,[%s])", search, force ? "force" : "cache ok");

    var current_login  = this.currentLogin;
    var search_key     = hex_md5(current_login + "@@" + search);
    var me             = this;

    if( !this.cardLoaded() ) {
        setTimeout(function(){ me.searchTasks(force); }, 500);
        return;
    }

    if( !this.dbBusy() ) {
        setTimeout(function(){ me.searchTasks(force); }, 500);
        return;
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

    Mojo.Log.info("TaskManager::searchTasks() checking cache [%s]", search_key);

    var entry = this.data.cache[search_key];
    if( entry ) {
        var now = Math.round(new Date().getTime()/1000.0);

        Mojo.Log.info("TaskManager::searchTasks() cache hit [%s], checking timestamp", search_key);

        this.dbBusy(true);
        this.dbo.get(search_key, this.recvCache, this.dbRecvFail);

        if( (now - entry.entered) < 4000 ) {
            Mojo.Log.info("TaskManager::searchTasks() young enough, /action/DownloadTasks");

            if( !force )
                return; // young enough that we don't do the request below
        }
    }

    this.req = new Ajax.Request('http://hiveminder.com/=/action/DownloadTasks.json', {
        method:     'post',
        parameters: {format: "json", query: search.replace(/\s+/g, "/")},
        evalJSON:   true,

        onSuccess: function(transport) {
            var e = [];

            if( transport.status === 200 ) {
                var r = transport.responseJSON;

                delete me.req;

                if( r ) {
                    if( r.success ) {
                        Mojo.Log.info("TaskManager::searchTasks()::onSuccess() r.success r=%s", Object.toJSON(r));

                        me.setCache(search_key, (me.tasks = r) );
                        me.processTasks();

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

        },

        onFailure: function(transport) {
            Mojo.Log.info("TaskManager::searchTasks()::onFailure() transport=%s", Object.toJSON(transport));

            var t = new Template($L("Ajax Error: #{status}"));
            var m = t.evaluate(transport);
            var e = [m];

            delete me.req;

            Mojo.Controller.errorDialog(e.join("... "));

        }

    });

};

/*}}}*/

/* {{{ */ TaskManager.prototype.dbSent = function() {
    Mojo.Log.info("TaskManager::dbSent()");

    this.dbBusy(false);
};

/*}}}*/
/* {{{ */ TaskManager.prototype.dbSentFail = function(transaction, error) {
    Mojo.Log.info("TaskManager::dbSentFail()");
    Mojo.Controller.errorDialog("ERROR storing cache information (#" + error.message + ").  Clearing cache if possible.");

    // Is this an overreaction or downright prudent?  Personally, I hate the
    // idea of the cache db getting corrupted and losing track of huge keys in
    // the Depot...

    var me = this;
    this.dbo.removeAll(function(){ me.cacheInit(); me.dbBusy(false); },
        this.dbSentFail); // is it crazy to go around again?  Personally I hope
                          // this comes up infrequently.  in a worst case,
                          // they'll just close the card anyway.
};

/*}}}*/

/* {{{ */ TaskManager.prototype.dbRecv = function(data) {
    Mojo.Log.info("TaskManager::dbRecv()");

    this.cardLoaded(true);

    if( data != null ) { // neither null nor undefined

        switch( data.version ) {
            default:
                this.data = data;
                break;
        }

        var now = Math.round(new Date().getTime()/1000.0);

        for( var k in this.data.cache )
            Mojo.Log.info("restored cache: %s [age: %ds]", k, now - this.data.cache[k].entered);

        this.dbBusy(false);
        this.checkCache();

    } else {

        this.dbBusy(false);
    }


};

/*}}}*/
/* {{{ */ TaskManager.prototype.dbRecvFail = function(transaction, error) {
    Mojo.Log.info("TaskManager::dbRecvFail()");
    Mojo.Controller.errorDialog("ERROR restoring account information (#" + error.message + ").");

    // weird... I hope this doesn't come up much.  I don't understand the implications of a db load fail
    // should we clear the cache here? [see dbSentFail for full discussion]

    var me = this;
    this.dbo.removeAll(function(){ me.cacheInit(); me.dbBusy(false); },
        this.dbRecvFail); // is it crazy to go around again? [see dbSentFail for full discussion]

};

/*}}}*/
/* {{{ */ TaskManager.prototype.dbRestore = function() {
    Mojo.Log.info("TaskManager::dbRestore()");

    if( this.dbBusy() ) {
        setTimeout(this.dbRestore, 500);
        return;
    }

    this.dbBusy(true);
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

    var me = this;

    if( this.dbBusy() ) {
        Mojo.Log.info("TaskManager::setCache() [busy]");
        // NOTE: this forms a closure (ie, dynamic lexical binding) over the lambda
        setTimeout(function() { me.setCache(key,data); }, 500);
        return;
    }

    this.dbBusy(true);


    Mojo.Log.info("TaskManager::setCache(key=%s) [adding]", key);

    var fail = function() { me.dbBusy(false); /* failed to add key, life goes on */ };
    var sent = function() {
        var now = Math.round(new Date().getTime()/1000.0);

        Mojo.Log.info("TaskManager::setCache(key=%s) [added, informing tm_data]", key);

        me.data.cache[key] = { entered: now };
        me.dbo.add("tm_data", me.data, me.dbSent, me.dbSentFail);
    };

    this.dbo.add(key, data, sent, fail); // try to add the key
    this.checkCache(); // won't actually run until db_busy = false
};

/*}}}*/
/* {{{ */ TaskManager.prototype.checkCache = function() {
    Mojo.Log.info("TaskManager::checkCache()");

    if( this.dbBusy() ) {
        Mojo.Log.info("TaskManager::checkCache() [busy]");
        setTimeout(this.checkCache, 500);
        return;
    }

    this.dbBusy(true);

    var now = Math.round(new Date().getTime()/1000.0);

    var did_stuff = false;

    for( var k in this.data.cache ) {
        if( (now - this.data.cache[k].entered) >= 4000 ) {
            Mojo.Log.info("%s expired", k);

            var err  = function() { Mojo.Log.info("%s expired, but apparently couldn't be removed... :(", k); };
            var sent = function() {
                Mojo.Log.info("%s expired and removed", k);
                delete this.data.cache[k];
                did_stuff = true;
            };

            this.dbo.remove(k, sent, err);
        }
    }

    if( did_stuff )
        this.dbo.add("tm_data", this.data, this.dbSent, this.dbSentFail);

    else
        this.dbBusy(false);

};

/*}}}*/

/* {{{ */ TaskManager.prototype.dbBusy = function(arg) {

    if( arg != null ) // neither null nor undefined
        this._dbBusy = arg;

    Mojo.Log.info("TaskManager::dbBusy(%s) [%s]", arg, this._dbBusy);

    return this._dbBusy;
};

/*}}}*/
/* {{{ */ TaskManager.prototype.cardLoaded = function(arg) {

    if( arg != null ) // neither null nor undefined
        this._cardLoaded = arg;

    Mojo.Log.info("TaskManager::cardLoaded(%s) [%s]", arg, this._cardLoaded);

    return this._cardLoaded;
};

/*}}}*/

/* {{{ /**/ TaskManager.prototype.registerTasksChangeCallback = function(callback) {
    Mojo.Log.info("TaskManager::registerTasksChangeCallback()");

    this.tasksChangeCallback.push(callback);
    this.notifyTasksChangeStep(callback);
};

/*}}}*/
/* {{{ /**/ TaskManager.prototype.unregisterTasksChangeCallback = function(callback) {
    Mojo.Log.info("AccountManager::unregisterTasksChangeCallback()");

    this.tasksChangeCallback = this.tasksChangeCallback.reject(function(_c){ return _c === callback; });
};

/*}}}*/
/* {{{ /**/ TaskManager.prototype.notifyTasksChangeStep = function(callback) {
    Mojo.Log.info("TaskManager::notifyTasksChangeStep()");

    var tasks = [];

    callback(tasks);
};

/*}}}*/
/* {{{ /**/ TaskManager.prototype.notifyTasksChange = function() {
    Mojo.Log.info("AccountManager::notifyTasksChange()");

    for( var i=0; i<this.tasksChangeCallback.length; i++ )
        this.notifyTasksChangeStep(this.tasksChangeCallback[i]);
};

/*}}}*/

Mojo.Log.info('loaded(TaskManager.js)');

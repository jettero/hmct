/*jslint white: false, onevar: false
*/
/*global Mojo AMO REQ Template OPT setTimeout
*/

/* {{{ */ function TaskManager() {
    Mojo.Log.info("TaskManager()");

    this.handleLoginChange = this.handleLoginChange.bind(this);

    AMO.registerLoginChange(this.handleLoginChange);

    this.tasksChangeCallback = [];
    this.defaultSearch = "accepted but first nothing not complete due before 7 days from now hidden until before tomorrow not hidden forever";

    this.cardLoaded(false);
}

/*}}}*/

/* {{{ */ TaskManager.prototype.handleLoginChange = function(emails,current) {
    Mojo.Log.info("TaskManager::handleLoginChange(current=%s)", current);

    this.currentLogin = current;

    if( current )
        this.searchTasks();

};

/*}}}*/
/* {{{ */ TaskManager.prototype.activate = function() {
    this.searchTasks();
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

    this.notifyTasksChange();
};

/*}}}*/
/* {{{ */ TaskManager.prototype.searchTasks = function(search,force) {
    if( !search ) {
        if( !this.lastSearch ) {
            search = this.defaultSearch;

        } else {
            search = this.lastSearch;
        }
    }

    Mojo.Log.info("TaskManager::searchTasks(%s,[%s])", search, force ? "force" : "cache ok");

    var current_login  = this.currentLogin;
    var search_key     = hex_md5(current_login + "@@" + search);
    var me             = this;

    if( !this.cardLoaded() ) {
        setTimeout(function(){ me.searchTasks(search,force); }, 500);
        return;
    }

    if( this.dbBusy() ) {
        setTimeout(function(){ me.searchTasks(search,force); }, 500);
        return;
    }

    Mojo.Log.info("TaskManager::searchTasks() checking cache [%s]", search_key);

    this.lastSearch = search;

    var entry = this.data.cache[search_key];
    if( entry ) {
        var now = Math.round(new Date().getTime()/1000.0);
        var ds = now - entry.entered;

        this.dbBusy(true);
        this.dbo.get(search_key, this.recvCache, this.dbRecvFail);

        Mojo.Log.info("TaskManager::searchTasks() cache hit [%s], fetching and checking timestamp (ds=%d)", search_key, ds);

        if( ds < OPT.cacheMaxAge ) {
            Mojo.Log.info("TaskManager::searchTasks() young enough, no fresh download needed (force=%s)", force ? "true" : "false");

            if( !force )
                return; // young enough that we don't do the request below
        }
    }

    // AjaxDRY(desc,url,method,params,success,failure);

    this._ajax_dry = new AjaxDRY("TaskManager::searchTasks()", 'http://hiveminder.com/=/action/DownloadTasks.json',
        'post', {format: "json", query: search.replace(/\s+/g, "/")},

        function(r) {

            if( r.success ) {
                Mojo.Log.info("TaskManager::searchTasks()::onSuccess() r.content.result=%s", r.content.result);

                me.setCache(search_key, (me.tasks = me.fixutf8( r.content.result ).evalJSON()) );
                me.processTasks();

            } else {
                Mojo.Log.info("TaskManager::searchTasks()::onSuccess() r.fail, r=%s", Object.toJSON(r));

                var e = [];

                if( r.error )
                    e.push(r.error);

                for(var k in r.field_errors )
                    e.push(k + "-error: " + r.field_errors[k]);

                if( !e.length )
                    e.push("Something went wrong with the task search ...");

                Mojo.Controller.errorDialog(e.join("... "));
            }
        }

    );

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

    this.newkCache(); // is it crazy to maybe cause an infinite loop here?
                      // Personally I hope this comes up infrequently.  in a
                      // worst case, they'll just close the card anyway.
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
    // should we clear the cache here? [see dbSentFail for initial discussion]

    this.newkCache();
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

/* {{{ */ TaskManager.prototype.newkCache = function() {
    Mojo.Log.info("TaskManager::newkCache()");

    var me = this;
    this.dbBusy(true);
    this.dbo.removeAll(function(){

        me.cacheInit();
        me.dbo.add("tm_data", me.data, me.dbSent, me.dbSentFail);

    }, this.newkCache); // maybe cause infinite loop? see dbSentFail for initial discussion...
};

/*}}}*/
/* {{{ */ TaskManager.prototype.checkCache = function() {
    if( this.dbBusy() ) {
        Mojo.Log.info("TaskManager::checkCache() [busy]");
        setTimeout(this.checkCache, 500);
        return;
    }

    Mojo.Log.info("TaskManager::checkCache() [start]");

    this.dbBusy(true);

    var now = Math.round(new Date().getTime()/1000.0);

    var me = this;
    var did_stuff = false;
    var problems = false;
    var done = 0;

    var end = function() {
        Mojo.Log.info("TaskManager::checkCache() [end lambda, did_stuff:%s, problems:%s]", did_stuff, problems);

        if( problems ) {
            me.newkCache();
            return;
        }

        if( did_stuff ) {
            Mojo.Log.info("TaskManager::checkCache() [did_stuff=true, saving tm_data]");
            me.dbo.add("tm_data", me.data, me.dbSent, me.dbSentFail);

        } else {
            Mojo.Log.info("TaskManager::checkCache() [did_stuff=false, unlocking db]");
            me.dbBusy(false);
        }
    };

    var nothing_expired = true;
    for( var k in this.data.cache ) {
        if( (now - this.data.cache[k].entered) >= OPT.cacheMaxAge ) {
            Mojo.Log.info("TaskManager::chechCache() [%s expired]", k);

            var err  = function() {
                Mojo.Log.info("TaskManager::checkCache() [%s expired, but apparently couldn't be removed]", k);
                problems = true;

                done --;
                if( done < 1 )
                    end();
            };

            var sent = function() {
                Mojo.Log.info("TaskManager::checkCache() [%s expired and removed]", k);
                delete me.data.cache[k];
                did_stuff = true;

                done --;
                if( done < 1 )
                    end();
            };

            done ++;
            this.dbo.discard(k, sent, err);
            nothing_expired = false;
        }
    }

    if( nothing_expired )
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

/* {{{ */ TaskManager.prototype.registerTasksChange = function(callback) {
    Mojo.Log.info("TaskManager::registerTasksChange()");

    this.tasksChangeCallback.push(callback);
    this.notifyTasksChangeStep(callback);
};

/*}}}*/
/* {{{ */ TaskManager.prototype.unregisterTasksChange = function(callback) {
    Mojo.Log.info("AccountManager::unregisterTasksChange()");

    this.tasksChangeCallback = this.tasksChangeCallback.reject(function(_c){ return _c === callback; });
};

/*}}}*/
/* {{{ */ TaskManager.prototype.notifyTasksChangeStep = function(callback) {
    Mojo.Log.info("TaskManager::notifyTasksChangeStep() this.tasks=%s", Object.toJSON(this.tasks));

    var tasks = [];

    // r={"success": 1, "content": {"result":
    // "[{\"priority\":3,\"record_locator\":\"xxxx\",\"time_worked\":null,\"attachment_count\":0,\"repeat_period\":
    // \"once\",\"group\":null,\"summary\":\"test task 2 (due
    // today)\",\"time_left\":null,\"id\":xxxxx,\"repeat_every\":1,\"owner\":\"Paul

    if( this.tasks )
        for(var i=0; i<this.tasks.length; i++)
            tasks.push( Object.clone(this.tasks[i]) ); // shallow copy, but this should be good enough

    callback(tasks);
};

/*}}}*/
/* {{{ */ TaskManager.prototype.notifyTasksChange = function() {
    Mojo.Log.info("AccountManager::notifyTasksChange()");

    for( var i=0; i<this.tasksChangeCallback.length; i++ )
        this.notifyTasksChangeStep(this.tasksChangeCallback[i]);
};

/*}}}*/

/* {{{ */ TaskManager.prototype.fixutf8 = function (utftext) { // stolen from: http://www.webtoolkit.info/javascript-utf8.html
    var str = "";
    var i = 0;
    var c,c1,c2,c3;

    while( i<utftext.length ) {

        c = utftext.charCodeAt(i);

        if (c < 128) {
            str += String.fromCharCode(c);
            i++;

        } else if((c > 191) && (c < 224)) {
            c2 = utftext.charCodeAt(i+1);
            str += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2;

        } else {
            c2 = utftext.charCodeAt(i+1);
            c3 = utftext.charCodeAt(i+2);
            str += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }

    }

    return str;
};

/*}}}*/

Mojo.Log.info('loaded(TaskManager.js)');

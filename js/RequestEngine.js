/*jslint white: false, onevar: false, laxbreak: true, maxerr: 500000
*/
/*global Mojo Ajax Template hex_md5 OPT BBO setTimeout
*/

function RequestEngine() {
    Mojo.Log.info("RequestEngine()");

    this.reqdb = {};

    var options = {
        name:    "HMCTCache",
        version: 1,
        replace: false // false, instead open existing if possible
    };

    this.dbo = new Mojo.Depot(options, function(){}, function(t, r){
        Mojo.Controller.errorDialog("Failed to open cache Depot (#" + r.message + ").");
    });
}

/* {{{ */ RequestEngine.prototype.doRequest = function(_r) {
    Mojo.Log.info("RequestEngine::doRequest(%s)", _r.desc);

    if( !_r.method || !_r.params || !_r.url || !_r.desc ) {
        Mojo.Log.info("RequestEngine::doRequest(%s) [missing params]", _r.desc);
        Mojo.Controller.errorDialog("internal error sending reqeust");
        return;
    }

    if( !_r.success ) _r.success = function()  { return true; };
    if( !_r.failure ) _r.failure = function()  { return true; };
    if( !_r.process ) _r.process = function(r) { return r;    };

    if( _r.cacheable && !_r.force ) {
        if( !_r.cache_key )
            _r.cache_key = _r.keyStrings
                         ? hex_md5( _r.keyStrings.join("|") )
                         : _r.desc;

        Mojo.Log.info("RequestEngine::doRequest(%s) [request is cachable using key: %s]", _r.desc, _r.cache_key);

        var entry = this.data.cache[_r.cache_key];
        if( entry ) {
            Mojo.Log.info("RequestEngine::doRequest(%s) [cache hit for %s, fetching", _r.desc, _r.cache_key);

            this.dbBusy(true);
            this.dbo.get(_r.cache_key, function(data) {
                    this.dbBusy(false);
                    this.finish(data);

                    var now = Math.round(new Date().getTime()/1000.0);
                    var ds = now - entry.entered;

                    if( ds >= OPT.cacheMaxAge ) {
                        Mojo.Log.info("RequestEngine::doRequest(%s) [cache entry is older, issuing new request]", _r.desc);

                        _r.force = true;
                        this._doRequest(_r);
                    }

                }.bind(this),

                function() {
                    Mojo.Log.info("RequestEngine::doRequest(%s) [cache entry load failure, forcing request]", _r.desc);
                    this.dbBusy(false);

                    _r.force = true;
                    this._doRequest(_r);

                }.bind(this)
            );

            return;
        }
    }

    this._doRequest(_r);
};

/*}}}*/
/* {{{ */ RequestEngine.prototype._doRequest = function(_r) {
    Mojo.Log.info("RequestEngine::_doRequest(%s) [actually starting web request]", _r.desc);

    if( this.reqdb[_r.desc] ) {
        Mojo.Log.info("RequestEngine::_doRequest(%s) [canceling apparently running request]", _r.desc);

        try {
            this.reqdb[_r.desc].transport.abort();
        }

        catch(e) {
            Mojo.Log.info("RequestEngine::_doRequest(%s) [problem canceling previous request: %s]", _r.desc, e);
        }
    }

    BBO.busy(_r.desc);
    var me = this;

    this.reqdb[_r.desc] = new Ajax.Request(_r.url, {
        method: _r.method, parameters: _r.params, evalJSON: true,

        onSuccess: function(transport) {
            BBO.done(_r.desc);
            delete me.reqdb[_r.desc];

            var e;

            if( transport.status >= 200 && transport.status < 300 ) {
                Mojo.Log.info("RequestEngine::_doRequest(%s) ajax success transport=%s", _r.desc, Object.toJSON(transport));

                var r = transport.responseJSON;

                if( r ) {
                    if( _r.success(r) ) { // sometimes successful ajax isn't a successful API call
                        r = _r.process(r); // when thinks go well, send the request back for preprocessing, if desired

                        if( _r.cacheable ) // next, if it's cachable,
                            me.dbSetCache(_r.cache_key, r); // do so

                        _r.finish(r); // lastly, pass the final result to finish
                    }

                } else if( _r.failure() ) {
                    e = ["Unknown error issuing " + _r.desc + " request"];

                    Mojo.Controller.errorDialog(e.join("... "));
                }

            } else if( !transport.status ) {
                Mojo.Log.info("RequestEngine::_doRequest(%s) ajax abort? transport=%s", _r.desc, Object.toJSON(transport));

                // this seems to be what happens on an abort

            } else {
                Mojo.Log.info("RequestEngine::_doRequest(%s) ajax mystery fail r=%s", _r.desc, Object.toJSON(transport));

                if( _r.failure() ) {
                    e = ["Unknown error issuing " + _r.desc + " request"];

                    Mojo.Controller.errorDialog(e.join("... "));
                }
            }

        },

        onFailure: function(transport) {
            BBO.done(_r.desc);
            delete me.reqdb[_r.desc];

            if( _r.failure() ) {
                var t = new Template("Ajax Error: #{status}");
                var m = t.evaluate(transport);
                var e = [m];

                Mojo.Controller.errorDialog(e.join("... "));
            }
        }

    });
};

/*}}}*/

/* {{{ */ RequestEngine.prototype.dbSetCache = function(key, data) {
    Mojo.Log.info("RequestEngine::dbSetCache(key=%s)", key);

    var me = this;

    if( this.dbBusy() ) {
        Mojo.Log.info("RequestEngine::dbSetCache() [busy]");
        setTimeout(function() { me.dbSetCache(key, data); }, 500);
        return;
    }

    this.dbBusy(true);

    Mojo.Log.info("RequestEngine::dbSetCache(key=%s) [adding]", key);

    var fail = function() { me.dbBusy(false); /* failed to add key, life goes on */ };
    var sent = function() {
        var now = Math.round(new Date().getTime()/1000.0);

        Mojo.Log.info("RequestEngine::dbSetCache(key=%s) [added, informing cache_list]", key);

        me.data.cache[key] = { entered: now };
        me.dbo.add("cache_list", me.data, me.dbSent, me.dbSentFail);
    };

    this.dbo.add(key, data, sent, fail); // try to add the key
    this.dbCheckAge(); // won't actually run until db_busy = false
};

/*}}}*/

/* {{{ */ RequestEngine.prototype.dbBusy = function(arg) {

    if( arg != null ) // neither null nor undefined
        this._dbBusy = arg;

    Mojo.Log.info("RequestEngine::dbBusy(%s) [%s]", arg, this._dbBusy);

    return this._dbBusy;
};

/*}}}*/

/* {{{ */ RequestEngine.prototype.dbNewk = function() {
    Mojo.Log.info("RequestEngine::dbNewk()");

    var me = this;
    this.dbBusy(true);
    this.dbo.removeAll(function(){

        me.dbInit();
        me.dbo.add("cache_list", me.data, me.dbSent, me.dbSentFail);

    }, this.dbNewk); // maybe cause infinite loop? see dbSentFail for initial discussion...
};

/*}}}*/
/* {{{ */ RequestEngine.prototype.dbCheckAge = function() {
    if( this.dbBusy() ) {
        Mojo.Log.info("RequestEngine::dbCheckAge() [busy]");
        setTimeout(this.dbCheckAge, 500);
        return;
    }

    Mojo.Log.info("RequestEngine::dbCheckAge() [start]");

    this.dbBusy(true);

    var now = Math.round(new Date().getTime()/1000.0);

    var me = this;
    var did_stuff = false;
    var problems = false;
    var done = 0;

    var end = function() {
        Mojo.Log.info("RequestEngine::dbCheckAge() [end lambda, did_stuff:%s, problems:%s]", did_stuff, problems);

        if( problems ) {
            me.dbNewk();
            return;
        }

        if( did_stuff ) {
            Mojo.Log.info("RequestEngine::dbCheckAge() [did_stuff=true, saving cache_list]");
            me.dbo.add("cache_list", me.data, me.dbSent, me.dbSentFail);

        } else {
            Mojo.Log.info("RequestEngine::dbCheckAge() [did_stuff=false, unlocking db]");
            me.dbBusy(false);
        }
    };

    var nothing_expired = true;
    for( var k in this.data.cache ) {
        if( (now - this.data.cache[k].entered) >= OPT.cacheMaxAge ) {
            Mojo.Log.info("RequestEngine::chechCache() [%s expired]", k);

            var err  = function() {
                Mojo.Log.info("RequestEngine::dbCheckAge() [%s expired, but apparently couldn't be removed]", k);
                problems = true;

                done --;
                if( done < 1 )
                    end();
            };

            var sent = function() {
                Mojo.Log.info("RequestEngine::dbCheckAge() [%s expired and removed]", k);
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
/* {{{ */ RequestEngine.prototype.dbInit = function() {
    Mojo.Log.info("RequestEngine::dbInit()");

    this.data = { version: 1, cache: {} };
};

/*}}}*/
/* {{{ */ RequestEngine.prototype.dbRestore = function() {
    Mojo.Log.info("RequestEngine::dbRestore()");

    if( this.dbBusy() ) {
        setTimeout(this.dbRestore, 500);
        return;
    }

    this.dbBusy(true);
    this.dbo.get("cache_list", this.dbRecv, this.dbRecvFail);
};

/*}}}*/

/* {{{ */ RequestEngine.prototype.dbSent = function() {
    Mojo.Log.info("RequestEngine::dbSent()");

    this.dbBusy(false);
};

/*}}}*/
/* {{{ */ RequestEngine.prototype.dbSentFail = function(transaction, error) {
    Mojo.Log.info("RequestEngine::dbSentFail()");
    Mojo.Controller.errorDialog("ERROR storing cache information (#" + error.message + ").  Clearing cache if possible.");

    // Is this an overreaction or downright prudent?  Personally, I hate the
    // idea of the cache db getting corrupted and losing track of huge keys in
    // the Depot...

    this.dbNewk(); // is it crazy to maybe cause an infinite loop here?
                   // Personally I hope this comes up infrequently.  in a
                   // worst case, they'll just close the card anyway.
};

/*}}}*/

/* {{{ */ RequestEngine.prototype.dbRecv = function(data) {
    Mojo.Log.info("RequestEngine::dbRecv()");

    if( data != null ) { // neither null nor undefined

        switch( data.version ) {
            default:
                this.data = data;
                break;
        }

        var now = Math.round(new Date().getTime()/1000.0);

        for( var k in this.data.cache )
            Mojo.Log.info("restored cache: %s [age: %ds]", k, now - this.data.cache[k].entered);

        // clear this now? wait until the first dbSetCache?
        // this.dbCheckAge();

    }

    this.dbBusy(false);
};

/*}}}*/
/* {{{ */ RequestEngine.prototype.dbRecvFail = function(transaction, error) {
    Mojo.Log.info("RequestEngine::dbRecvFail()");
    Mojo.Controller.errorDialog("ERROR restoring cache information (#" + error.message + ").");

    // weird... I hope this doesn't come up much.  I don't understand the implications of a db load fail
    // should we clear the cache here? [see dbSentFail for initial discussion]

    this.dbNewk();
};

/*}}}*/

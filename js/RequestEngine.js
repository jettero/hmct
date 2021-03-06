/*jslint white: false, onevar: false, laxbreak: true, maxerr: 500000
*/
/*global Mojo Ajax Template hex_md5 OPT BBO setTimeout clearTimeout ErrorDialog RetryDialog
*/

function RequestEngine() {
    Mojo.Log.info("RequestEngine()");

    this.reqdb = {};

    var options = {
        name:    "HMCTCache",
        version: 1,
        replace: false // false, instead open existing if possible
    };

    this.e = new ErrorDialog("RequestEngine");
    this.E = this.e.showError;

    this.r = new RetryDialog("RequestEngine");
    this.R = this.r.showRetry;

    this.dbo = new Mojo.Depot(options, function(){}, function(t, r){
        this.E(false, "depot", "Failed to open cache Depot (#" + r.message + ")");
    });

    this.dbCheckAge = this.dbCheckAge.bind(this);  // used in setTimeout without need for local bindings

    this.dbSent     = this.dbSent.bind(this);
    this.dbRecv     = this.dbRecv.bind(this);
    this.dbSentFail = this.dbSentFail.bind(this);
    this.dbRecvFail = this.dbRecvFail.bind(this);

    this._engineLoaded = 
    this._dbBusy       =
    this._reqBusy      = false;

    this.dbInit();
    this.dbRestore();

    this._busyCalls = { db: [], req: [] };
}

/* {{{ */ RequestEngine.prototype.now = function() {
    var d   = new Date();
    var t   = d.getTime();
    var now = Math.round( t/1000.0 );

    return now;
};

/*}}}*/

/* {{{ */ RequestEngine.prototype.engineLoaded = function(arg) {
    if( arg != null ) // neither null nor undefined
        this._engineLoaded = arg;

    Mojo.Log.info("RequestEngine::engineLoaded(%s) [%s]", arg, this._engineLoaded);

    return this._engineLoaded;
};

/*}}}*/

/* {{{ */ RequestEngine.prototype.doRequest = function(_r) {
    if( !_r.desc ) {
        this.E("doRequest", "desc-error", "INTERNAL ERROR: _r.desc was not provided");
        return;
    }

    if( !_r._logdesc )
        _r._logdesc = "[" + _r.desc.replace(/::/, "-").replace(/[()]/g, "^").toLowerCase() + "]";

    Mojo.Log.info("RequestEngine::doRequest(%s)", _r._logdesc);

    if( this.dbBusy() ) {
        Mojo.Log.info("RequestEngine::doRequest(%s) [busy]", _r._logdesc);
        this.pushBusyCall('db', this.doRequest, [_r]);
        return;
    }

    var required = ['method', 'url', 'desc'];
    var interr = false;
    var i;

    for(i=0; i<required.length; i++) {
        if( !_r[required[i]] ) {
            Mojo.Log.info("RequestEngine::doRequest(%s) [missing _r.[%s] param]", _r._logdesc, required[i]);
            interr = true;
        }
    }

    var forbidden = ['param'];

    for(i=0; i<forbidden.length; i++) {
        if( _r[forbidden[i]] ) {
            Mojo.Log.info("RequestEngine::doRequest(%s) [forbidden _r.[%s] param]", _r._logdesc, forbidden[i]);
            interr = true;
        }
    }

    if( interr ) {
        this.E("doRequest", "required/forbidden", "internal error reqeust not sent");
        return;
    }

    if( typeof(_r.params)  !== 'object'   ) _r.params  = {};
    if( typeof(_r.success) !== 'function' ) _r.success = function()  { return true; };
    if( typeof(_r.process) !== 'function' ) _r.process = function(r) { return r;    };
    if( typeof(_r.failure) !== 'function' ) _r.failure = function()  { return true; };
    if( typeof(_r.finish)  !== 'function' ) _r.finish  = function(r) { return;      };

    if( _r.cacheable ) {

        if( !_r.cacheKey )
            _r.cacheKey = _r.keyStrings
                        ? hex_md5( _r.desc + "||" + _r.keyStrings.join("|") )
                        : _r.desc;

        Mojo.Log.info("RequestEngine::doRequest(%s) [request is cacheable using key: %s; forced: %s; rcma: %d(%s)]",
            _r._logdesc, _r.cacheKey, _r.force ? "yes" : "no",
            _r.cacheMaxAgeOverride, typeof(_r.cacheMaxAgeOverride)
        );

        if( !_r.force ) {
            var entry = this.data.cache[_r.cacheKey];

            if( entry ) {
                Mojo.Log.info("RequestEngine::doRequest(%s) [cache hit for %s, fetching]", _r._logdesc, _r.cacheKey);

                this.dbBusy(true);
                this.dbo.get(_r.cacheKey, function(data) {
                        this.dbBusy(false);

                        if( data === null ) {
                            _r.force = true;
                            this._doRequest(_r);
                            return;
                        }

                        var now = this.now();
                        var ds  = now - entry.entered;
                        var st  = entry.stale;
                        var cma = typeof(_r.cacheMaxAgeOverride) === 'number' ? _r.cacheMaxAgeOverride :  OPT.cacheMaxAge;
                        var soo = ds > cma || st;

                        data._req_cacheAge = ds;
                        data._req_cacheKey = _r.cacheKey;
                        data._req_cacheStaleOrOld = soo;

                        _r.finish(data);

                        if( soo ) {
                            Mojo.Log.info("RequestEngine::doRequest(%s) [cache entry is older(%d>=%d) or stale(%s), issuing new request]",
                                 _r._logdesc, ds, cma, st);

                            _r.force = true;
                            this._doRequest(_r);

                        } else {
                            Mojo.Log.info("RequestEngine::doRequest(%s) [cache entry is good enough (%d < %d)]", _r._logdesc, ds, cma);
                        }

                    }.bind(this),

                    function() {
                        Mojo.Log.info("RequestEngine::doRequest(%s) [cache entry load failure, forcing request]", _r._logdesc);
                        this.dbBusy(false);

                        _r.force = true;
                        this._doRequest(_r);

                    }.bind(this)
                );

                return;
            }

        }
    }

    this._doRequest(_r);
};

/*}}}*/
/* {{{ */ RequestEngine.prototype._doRequest = function(_r,isRetry) {
    Mojo.Log.info("RequestEngine::_doRequest(%s) [actually starting web request] isRetry=%s", _r._logdesc, isRetry);

    if( !isRetry ) {
        if( this.reqdb[_r.desc] ) {
            Mojo.Log.info("RequestEngine::_doRequest(%s) [canceling apparently running request]", _r._logdesc);

            try {
                this.reqdb[_r.desc].transport.abort();
            }

            catch(e) {
                Mojo.Log.info("RequestEngine::_doRequest(%s) [problem canceling previous request: %s]", _r._logdesc, e);
            }
        }

        if( this.reqBusy() ) {
            Mojo.Log.info("RequestEngine::_doRequest() [busy]");
            this.pushBusyCall('req', this._doRequest, [_r,isRetry]);
            return;
        }

        this.reqBusy(true);

        BBO.busy(_r.desc);
    }

    /*
    else {
        ... well, all that shit is really already done for us ...
    }
    */

    var me = this;
    var request;

    this.reqdb[_r.desc] = request = new Ajax.Request(_r.url, {
        method: _r.method, parameters: _r.params, evalJSON: !_r.xml, evalJS: !_r.xml,

        onSuccess: function(transport) {
            me.reqBusy(false);

            BBO.done(_r.desc);
            delete me.reqdb[_r.desc];

            if( transport.status >= 200 && transport.status < 300 ) {
                Mojo.Log.info("RequestEngine::_doRequest(%s) ajax success", _r._logdesc);

                var r;
                try {
                    if( _r.xml ) {
                        r = transport.responseText;
                        Mojo.Log.info("RequestEngine::_doRequest(%s) chose responseText from transport", _r._logdesc);

                    } else {
                        r = transport.responseJSON;
                        Mojo.Log.info("RequestEngine::_doRequest(%s) chose responseJSON from transport", _r._logdesc);
                    }
                }

                catch(_errcnt) {
                    Mojo.Log.error("RequestEngine::_doRequest(%s) Problem finding request contents: %s", _r._logdesc, _errcnt);

                    if( _r.failure() )
                        me.E("_doRequest", "xml missing", "Unexpected js error pulling data during ajax request: " + _errcnt);

                    return;
                }

                var part = "??";
                try {
                    if( r ) {
                        part = "success";

                        if( _r.success(r) ) { // sometimes successful ajax isn't a successful API call

                            part = "process";

                            r = _r.process(r); // when things go well, send the request back for preprocessing, if desired

                            part = "cache";

                            if( typeof r !== 'object' )
                                r = {}; // sometimes process() doesn't do anything

                            if( _r.cacheable ) // next, if it's cacheable,
                                me.dbSetCache(_r.cacheKey, r); // do so

                            r._req_cacheAge = 0;
                            r._req_cacheKey = _r.cacheKey;

                            part = "finish";

                            _r.finish(r); // lastly, pass the final result to finish
                        }

                    } else if( _r.failure() ) {
                        me.E("_doRequest", "no result", "Unknown error issuing " + _r.desc + " request");

                        return;
                    }
                }

                catch(_errcb) {
                    Mojo.Log.error("RequestEngine::_doRequest(%s) Problem executing ajax callbacks [%s]: %s",
                        _r._logdesc, part, _errcb);

                    if( _r.failure() )
                        me.E("_doRequest", "callback",
                            "Unexpected internal js error passing \""
                            + _r.desc + "\" [" + part + "] data to application: " + _errcb);

                    return;
                }

            } else if( !transport.status ) {
                Mojo.Log.info("RequestEngine::_doRequest(%s) ajax abort?", _r._logdesc);

                // this seems to be what happens on an abort

                if( request.retryRequested ) {
                    Mojo.Log.info("RequestEngine::_doRequest(%s) ajax abort-retry requested", _r._logdesc);
                    me._doRequest(_r); // NOTE: we do not set isRetry here because we've already set reqBusy(false)
                }

            } else {
                Mojo.Log.info("RequestEngine::_doRequest(%s) ajax mystery fail", _r._logdesc);

                if( _r.failure() )
                    me.E("_doRequest", "mystery", "Unknown error issuing " + _r.desc + " request");

                return;
            }

            return;
        },

        onFailure: function(transport) {
            me.reqBusy(false);

            BBO.done(_r.desc);
            delete me.reqdb[_r.desc];

            var t = new Template("Ajax #{status} Error: #{responseText} while fetching: \"" + _r.url + "\"");
            if( _r.failure(_r, transport, t) ) {
                me.R("_doRequest", "ajax", t.evaluate(transport), function(value) {
                    if( value === "retry" ) {
                        Mojo.Log.info("RequestEngine::_doRequest(%s) ajax retry requested", _r._logdesc);
                        me._doRequest(_r);

                    } else {
                        Mojo.Log.info("RequestEngine::_doRequest(%s) ajax ignore requested", _r._logdesc);
                    }
                });
            }
        }

    });
};

/*}}}*/

/* {{{ */ RequestEngine.prototype.dbSetCache = function(key, data) {
    Mojo.Log.info("RequestEngine::dbSetCache(key=%s)", key);

    if( !key || !data ) {
        Mojo.Log.info("RequestEngine::dbSetCache(key=%s, data=%s) [refusing to caching bs]", key, data);
        return;
    }

    if( this.dbBusy() ) {
        Mojo.Log.info("RequestEngine::dbSetCache() [busy]");
        this.pushBusyCall('db', this.dbSetCache, [key,data]);
        return;
    }

    this.dbBusy(true);

    Mojo.Log.info("RequestEngine::dbSetCache(key=%s) [adding]", key);

    var me = this;

    var fail = function() { me.dbBusy(false); /* failed to add key, life goes on */ };
    var sent = function() {
        var now = me.now();

        Mojo.Log.info("RequestEngine::dbSetCache(key=%s) [added, informing cache_list, now=%d]", key, now);

        me.data.cache[key] = { entered: now, stale: false };
        me.dbo.add("cache_list", me.data, me.dbSent, me.dbSentFail);
    };

    this.dbo.add(key, data, sent, fail); // try to add the key
    this.dbCheckAgeStart(); // won't actually run for a while
};

/*}}}*/
/* {{{ */ RequestEngine.prototype.markCacheStale = function(key) {
    Mojo.Log.info("RequestEngine::markCacheStale(key=%s)", key);

    if( this.data.cache[key] ) {
        this.data.cache[key].stale = true;
        this.dbo.add("cache_list", this.data, this.dbSent, this.dbSentFail);
        this.dbCheckAgeStart(); // won't actually run for a while

    } else {
        Mojo.Log.info("RequestEngine::markCacheStale(key=%s): no such key, not marking");
    }
};

/*}}}*/

/* {{{ */ RequestEngine.prototype.dbBusy = function(arg) {
    var engineLoaded = this.engineLoaded();

    if( arg != null ) { // neither null nor undefined, since null==undefined
        this._dbBusy = arg;

        if( !arg && engineLoaded ) {
            var popres = this.popBusyCall('db');
            // when there's something to pop, we get a true this works as a
            // kind of soft busy signal, althoug since there's an argument,
            // we're probably not *asking* about the busy status at all.

            Mojo.Log.info("RequestEngine::dbBusy(%s) [dbBusy:%s + engineLoaded:%s: *POPBUSY*:%s]",
                arg, this._dbBusy, engineLoaded, popres);

            return popres;
        }
    }

    var result = this._dbBusy || !engineLoaded;
        // we're busy if the engine isn't loaded, no matter what the value of _dbBusy
        // if the db is busy, then dbBusy is true

    Mojo.Log.info("RequestEngine::dbBusy(%s) [dbBusy:%s + engineLoaded:%s: %s]",
        arg, this._dbBusy, engineLoaded, result);

    return result;
};

/*}}}*/
/* {{{ */ RequestEngine.prototype.reqBusy = function(arg) {
    if( arg != null ) { // neither null nor undefined, since null==undefined
        this._reqBusy = arg;

        if( !arg ) {
            var popres = this.popBusyCall('req');
            // when there's something to pop, we get a true this works as a
            // kind of soft busy signal, althoug since there's an argument,
            // we're probably not *asking* about the busy status at all.

            Mojo.Log.info("RequestEngine::reqBusy(%s) [reqBusy:%s ... *POPBUSY*:%s]",
                arg, this._reqBusy, popres);

            return popres;
        }
    }

    var result = this._reqBusy;
    Mojo.Log.info("RequestEngine::reqBusy(%s) [reqBusy:%s]", arg, result);
    return result;
};

/*}}}*/
/* {{{ */ RequestEngine.prototype.pushBusyCall = function(stackName, fp, args) {
    var stack = this._busyCalls[stackName];

    stack.push({fp: fp, args: args});

    Mojo.Log.info("RequestEngine::pushBusyCall() [stack: %s; depth: %d]", stackName, stack.length);
};

/*}}}*/
/* {{{ */ RequestEngine.prototype.popBusyCall = function(stackName) {
    var stack = this._busyCalls[stackName];

    Mojo.Log.info("RequestEngine::popBusyCall() [stack: %s; depth: %d]", stackName, stack.length);

    if( stack.length < 1 )
        return false; // return false if we have nothing to do

    var x = stack.shift();

    x.fp.apply(this, x.args);

    return true; // and true when we do
};

/*}}}*/
/* {{{ */ RequestEngine.prototype.bankrupt = function() {
    Mojo.Log.info("RequestEngine::bankrupt()");
    for(var k in this.reqdb) {
        try { this.reqdb[k].transport.abort(); }
        catch(e) {}
        delete this.reqdb[k];
    }
    this._busyCalls = { db: [], req: [] };
    this.reqBusy(false);
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
/* {{{ */ RequestEngine.prototype.dbCheckAgeStart = function() {
    Mojo.Log.info("RequestEngine::dbCheckAgeStart()");

    if( this._alreadyStartingCheckAge )
        clearTimeout(this._alreadyStartingCheckAge);

    this._alreadyStartingCheckAge = setTimeout(this.dbCheckAge, 15e3);
};

/*}}}*/
/* {{{ */ RequestEngine.prototype.dbCheckAge = function() {
    delete this._alreadyStartingCheckAge;

    if( this.dbBusy() ) {
        Mojo.Log.info("RequestEngine::dbCheckAge() [busy]");
        setTimeout(this.dbCheckAge, 500);
        return;
    }

    Mojo.Log.info("RequestEngine::dbCheckAge() [start]");

    this.dbBusy(true);

    var now = this.now();

    var me = this;
    var did_stuff = false;
    var problems = false;
    var done = 0;

    var end = function() {
        Mojo.Log.info("RequestEngine::dbCheckAge()::end() [did_stuff:%s, problems:%s]", did_stuff, problems);

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

    var bindLexicals = function(k) {
        return {

            sent: function() {
                Mojo.Log.info("RequestEngine::dbCheckAge() [%s expired and removed]", k);
                delete me.data.cache[k];
                did_stuff = true;

                done --;
                if( done < 1 )
                    end();
            },

            err: function() {
                Mojo.Log.info("RequestEngine::dbCheckAge() [%s expired, but apparently couldn't be removed]", k);
                problems = true;

                done --;
                if( done < 1 )
                    end();
            }

        };
    };

    var nothing_expired = true;
    for( var k in this.data.cache ) {
        var dt = now - this.data.cache[k].entered;
        var st = this.data.cache[k].stale;

        if( dt >= OPT.cacheCollectAge || (OPT.cacheCollectStale && st) ) {
            Mojo.Log.info("RequestEngine::dbCheckAge() main-loop:[%s expired; dt=%d>%d; stale=%s]",
                k, dt, OPT.cacheCollectAge, st);

            var _f = bindLexicals(k);

            done ++;
            this.dbo.discard(k, _f.sent, _f.err);
            nothing_expired = false;

        } else {
            Mojo.Log.info("RequestEngine::dbCheckAge() main-loop:[%s still-good; dt=%d≤%d; stale=%s]",
                k, dt, OPT.cacheCollectAge, st);
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
    this.E("dbSentFail", 'cache', "ERROR storing cache information (#" + error.message + ").  Clearing cache if possible.");

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

        var now = this.now();

        for( var k in this.data.cache )
            Mojo.Log.info("RequestEngine::dbRecv() restored cache: %s [age: %ds, stale: %s]",
                k, now - this.data.cache[k].entered, this.data.cache[k].stale);

        this.dbCheckAgeStart();
    }

    this.dbBusy(false);
    this.engineLoaded(true);
};

/*}}}*/
/* {{{ */ RequestEngine.prototype.dbRecvFail = function(transaction, error) {
    this.E("dbRecvFail", 'cache', "ERROR storing cache information (#" + error.message + ").  Clearing cache if possible.");

    // weird... I hope this doesn't come up much.  I don't understand the implications of a db load fail
    // should we clear the cache here? [see dbSentFail for initial discussion]

    this.dbNewk();
};

/*}}}*/

Mojo.Log.info('loaded(RequestEngine.js)');

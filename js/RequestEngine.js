/*jslint white: false, onevar: false
*/
/*global Mojo Ajax Template
*/

function RequestEngine() {
    Mojo.Log.info("RequestEngine()");
    this.reqdb = {};
}

RequestEngine.prototype.doRequest = function(_r) {
    Mojo.Log.info("RequestEngine::doRequest(%s)", _r.desc);

    if( !_r.success ) _r.success = function() { return true; };
    if( !_r.failure ) _r.failure = function() { return true; };

    if( !_r.method || !_r.params || !_r.url || !_r.desc ) {
        Mojo.Log.info("RequestEngine::doRequest(%s) [", _r.desc);
    }

    var e;

    if( _r.cacheable && !_r.force ) {
        if( !_r.cache_key )
            _r.cache_key = desc;

        Mojo.Log.info("RequestEngine::doRequest(%s) [request is cachable using key: %s]", _r.desc, _r.cache_key);

        var entry = this.data.cache[_r.cache_key];
        if( entry ) {
            Mojo.Log.info("RequestEngine::doRequest(%s) [cache hit for %s, fetching", _r.desc, _r.cache_key);

            this.dbBusy(true);
            this.dbo.get(_r.cache_key, function(data) {
                    this.dbBusy(false);
                    this.success(data);

                    var now = Math.round(new Date().getTime()/1000.0);
                    var ds = now - entry.entered;

                    if( ds >= OPT.cacheMaxAge ) {
                        Mojo.Log.info("RequestEngine::doRequest(%s) [cache entry is older, issuing new request]", _r.desc);

                        _r.force = true;
                        this.doRequest(_r);
                    }

                }.bind(this),

                function() {
                    Mojo.Log.info("RequestEngine::doRequest(%s) [cache entry load failure, forcing request]", _r.desc);
                    this.dbBusy(false);

                    _r.force = true;
                    this.doRequest(_r);

                }.bind(this)
            );

            return;
        }
    }

    if( this.reqdb[_r.desc] ) {
        Mojo.Log.info("RequestEngine::doRequest(%s) [canceling apparently running request]", _r.desc);

        try {
            this.reqdb[_r.desc].transport.abort();
        }

        catch(e) {
            Mojo.Log.info("RequestEngine::doRequest(%s) [problem canceling previous request: %s]", _r.desc, e);
        }
    }

    BBO.busy(_r.desc);

    if( this.reqdb[_r.desc] ) {
        Mojo.Log.info("RequestEngine::doRequest(%s) [canceling previous request]", _r.desc);

        try {
            this.reqdb[_r.desc].transport.abort();
        }

        catch(e) {
            Mojo.Log.info("RequestEngine::doRequest(%s) [problem canceling previous request: %s]", _r.desc, e);
        }
    }

    this.reqdb[_r.desc] = new Ajax.Request(_r.url, {
        method: _r.method, parameters: _r.params, evalJSON: true,

        onSuccess: function(transport) {
            BBO.done(_r.desc);
            delete this.reqdb[_r.desc];

            if( transport.status >= 200 && transport.status < 300 ) {
                Mojo.Log.info("%s ajax success transport=%s", _r.desc, Object.toJSON(transport));

                var r = transport.responseJSON;

                if( r ) {
                    success(r);

                } else if( failure() ) {
                    e = ["Unknown error issuing " + _r.desc + " request"];

                    Mojo.Controller.errorDialog(e.join("... "));
                }

            } else if( !transport.status ) {
                Mojo.Log.info("%s ajax abort? transport=%s", _r.desc, Object.toJSON(transport));

                // this seems to be what happens on an abort

            } else {
                Mojo.Log.info("%s ajax mystery fail r=%s", _r.desc, Object.toJSON(transport));

                if( failure() ) {
                    e = ["Unknown error issuing " + _r.desc + " request"];

                    Mojo.Controller.errorDialog(e.join("... "));
                }
            }

        },

        onFailure: function(transport) {
            BBO.done(_r.desc);
            delete this.reqdb[_r.desc];

            if( failure() ) {
                var t = new Template("Ajax Error: #{status}");
                var m = t.evaluate(transport);
                var e = [m];

                Mojo.Controller.errorDialog(e.join("... "));
            }
        }

    });
};

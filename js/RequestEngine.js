/*jslint white: false, onevar: false
*/
/*global Mojo Ajax Template
*/

function RequestEngine() {
}

RequestEngine.prototype.do_request = function(_r) {
    Mojo.Log.info("RequestEngine::do_request(%s)", _r.desc);

    if( _r.cacheable ) {
        Mojo.Log.info("RequestEngine::do_request(%s) [request is cachable using key: %s]", _r.desc, _r.cacheable);

        var entry = this.data.cache[_r.cacheable];
        if( entry ) {
            var now = Math.round(new Date().getTime()/1000.0);
            var ds = now - entry.entered;

            this.dbBusy(true);
            this.dbo.get(_r.cacheable, this.recvCache, this.dbRecvFail);

            Mojo.Log.info("RequestEngine::do_request() cache hit [%s], fetching and checking timestamp (ds=%d)", _r.cacheable, ds);

            if( ds < OPT.cacheMaxAge ) {
                Mojo.Log.info("RequestEngine::do_request() young enough, no fresh download needed (force=%s)", force ? "true" : "false");

                if( !_r.force ) // when we force, we sometimes still load the cache...
                    return; // but when we don't force and we're young enough, we don't do the request below
            }
        }
    }

    if( this.reqdb[desc] ) {
        Mojo.Log.info("AjaxDRY [canceling previous %s request]", desc);

        try {
            this.reqdb[desc].transport.abort();
        }

        catch(e) {
            Mojo.Log.info("AjaxDRY [problem canceling previous %s request: %s]", desc, e);
        }
    }
};

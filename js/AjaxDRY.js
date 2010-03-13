/*jslint white: false, onevar: false
*/
/*global Mojo Ajax Template
*/

var _AjaxDRY_reqdb = {};

function AjaxDRY(desc,url,method,params,success,failure) {
    var e;

    if( !success ) success = function() { return true; };
    if( !failure ) failure = function() { return true; };

    BBO.busy(desc);

    if( _AjaxDRY_reqdb[desc] ) {
        Mojo.Log.info("AjaxDRY [canceling previous %s request]", desc);

        try {
            _AjaxDRY_reqdb[desc].transport.abort();
        }

        catch(e) {
            Mojo.Log.info("AjaxDRY [problem canceling previous %s request: %s]", desc, e);
        }
    }

    _AjaxDRY_reqdb[desc] = new Ajax.Request(url, {
        method: method, parameters: params, evalJSON: true,

        onSuccess: function(transport) {
            BBO.done(desc);
            delete _AjaxDRY_reqdb[desc];

            if( transport.status >= 200 && transport.status < 300 ) {
                Mojo.Log.info("%s ajax success transport=%s", desc, Object.toJSON(transport));

                var r = transport.responseJSON;

                if( r ) {
                    success(r);

                } else if( failure() ) {
                    e = ["Unknown error issuing " + desc + " request"];

                    Mojo.Controller.errorDialog(e.join("... "));
                }

            } else if( !transport.status ) {
                Mojo.Log.info("%s ajax abort? transport=%s", desc, Object.toJSON(transport));

                // this seems to be what happens on an abort

            } else {
                Mojo.Log.info("%s ajax mystery fail r=%s", desc, Object.toJSON(transport));

                if( failure() ) {
                    e = ["Unknown error issuing " + desc + " request"];

                    Mojo.Controller.errorDialog(e.join("... "));
                }
            }

        },

        onFailure: function(transport) {
            BBO.done(desc);
            delete _AjaxDRY_reqdb[desc];

            if( failure() ) {
                var t = new Template("Ajax Error: #{status}");
                var m = t.evaluate(transport);
                var e = [m];

                Mojo.Controller.errorDialog(e.join("... "));
            }
        }

    });

}

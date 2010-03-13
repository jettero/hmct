/*jslint white: false, onevar: false
*/
/*global Mojo Ajax Template
*/

function AjaxDRY(desc,url,method,params,success,failure) {

    if( !success ) success = function() { return true; };
    if( !failure ) failure = function() { return true; };

    this.req = new Ajax.Request(url, {
        method: method, parameters: params, evalJSON: true,

        onSuccess: function(transport) {
            if( transport.status >= 200 && transport.status < 300 ) {
                Mojo.Log.info("%s ajax success transport=%s", desc, Object.toJSON(transport));

                success(transport.responseJSON);

            } else if( !transport.status ) {
                Mojo.Log.info("%s ajax abort? transport=%s", desc, Object.toJSON(transport));

                // this seems to be what happens on an abort

            } else {
                Mojo.Log.info("%s ajax mystery fail r=%s", desc, Object.toJSON(transport));

                if( failure() ) {
                    var e = ["Unknown error issuing " + desc + " request"];

                    Mojo.Controller.errorDialog(e.join("... "));
                }
            }

        },

        onFailure: function(transport) {
            if( failure() ) {
                var t = new Template("Ajax Error: #{status}");
                var m = t.evaluate(transport);
                var e = [m];

                Mojo.Controller.errorDialog(e.join("... "));
            }
        }

    });

}

AjaxDRY.prototype.abort = function() {

    this.req.transport.abort();

};

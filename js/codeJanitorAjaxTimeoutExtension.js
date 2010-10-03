/*jslint white: false, onevar: false, laxbreak: true, maxerr: 500000
*/
/*global Ajax setTimeout clearTimeout OPT Mojo REQ RetryAbortDialog
*/

/*
**
** http://codejanitor.com/wp/2006/03/23/ajax-timeouts-with-prototype/
**
*/

function callInProgress (xmlhttp) {
    switch (xmlhttp.readyState) {
        case 1:
        case 2:
        case 3:
            return true;

        // Case 4 and 0
        default:
            return false;
    }
}

Ajax.Responders.register({
    onCreate: function(request) {
        var f;

        request.before = REQ.now();
        request.timeoutId = setTimeout(
            f = function() {
                if (callInProgress(request.transport)) {
                    Mojo.Log.info("AJAX-ext Timeout fired dt=%d", REQ.now() - request.before);

                    request.timeoutDialog =
                        (new RetryAbortDialog('cJATE')).showRetry("cJATE::TO", "timeout",
                            "The current request has timed out...", function(value) {

                                request.timeoutDialog = undefined;

                                switch(value) {
                                    case "abort": request.transport.abort(); break;
                                    case "retry": request.retryRequested = true; break;
                                    case "wait":
                                        request.before = REQ.now();
                                        request.timeoutId = setTimeout(f, OPT.ajaxTimeout);
                                    break;
                                }

                            });

                    /*
                    ** we usetah just do this:
                    **

                    request.transport.abort();
                    if (request.options.onFailure) {
                        var x = {
                            'status':       "Timeout",
                            'responseText': "timeout after " + (OPT.ajaxTimeout/1e3) + " seconds"
                        };

                        request.options.onFailure(x);
                    }
                    */

                } else {
                    Mojo.Log.info("AJAX-ext Timeout fired dt=%d — but no call was in progress", REQ.now() - request.before);
                }
            },

            OPT.ajaxTimeout
        );
    },

    onComplete: function(request) {
        Mojo.Log.info("AJAX-ext Timeout cleared normally dt=%d", REQ.now() - request.before);
        clearTimeout(request.timeoutId);

        if( request.timeoutDialog ) {
            Mojo.Log.info("AJAX-ext RetryAbortDialog is open, closing");
            request.timeoutDialog.close();
        }
    }
});

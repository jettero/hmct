/*jslint white: false, onevar: false, laxbreak: true, maxerr: 500000
*/
/*global Ajax setTimeout clearTimeout OPT Mojo REQ
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

        request.before = REQ.now();
        request.timeoutId = setTimeout(
            function() {
                Mojo.Log.info("AJAX Timeout fired dt=%d", REQ.now() - request.before);

                if (callInProgress(request.transport)) {

                    request.transport.abort();

                    if (request.options.onFailure) {
                        var x = {
                            'status':       "Timeout",
                            'responseText': "timeout after " + (OPT.ajaxTimeout/1e3) + " seconds"
                        };

                        request.options.onFailure(x);
                    }
                }
            },

            OPT.ajaxTimeout
        );
    },

    onComplete: function(request) {
        Mojo.Log.info("AJAX Timeout cleared normally dt=%d", REQ.now() - request.before);
        clearTimeout(request.timeoutId);
    }
});

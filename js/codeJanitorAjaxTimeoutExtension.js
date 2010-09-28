/*jslint white: false, onevar: false, laxbreak: true, maxerr: 500000
*/
/*global Ajax setTimeout clearTimeout OPT
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

        request.timeoutId = setTimeout(

            function() {
                if (callInProgress(request.transport)) {

                    request.transport.abort();

                    if (request.options.onFailure)
                        request.options.onFailure(request.transport, request.json);
                }
            },

            OPT.ajaxTimeout
        );
    },

    onComplete: function(request) {
        clearTimeout(request.timeoutId);
    }
});

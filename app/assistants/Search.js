/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo $ OPT TMO
*/

function SearchAssistant() {
    Mojo.Log.info("Search()");
}

SearchAssistant.prototype.setup = function() {
    Mojo.Log.info("Search::setup()");

    var queryTextFieldAttributes = {
        textCase:      Mojo.Widget.steModeLowerCase,
        multiline:     false,
        autoFocus:     false,
        enterSubmits:  true
    };

    this.controller.setupWidget('query',     queryTextFieldAttributes, {});
    this.controller.setupWidget('not-query', queryTextFieldAttributes, {});
};

Mojo.Log.info('loaded(Search.js)');

/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo
*/

function FastCommentAssistant(_a) {
    this.controller = _a.controller;
}

FastCommentAssistant.prototype.setup = function() {
    this.controller.setupWidget('send',   {}, {buttonClass: "affirmative", label: "Send"} );
    this.controller.setupWidget('cancel', {}, {buttonClass: "negative",    label: "Cancel"} );

    this.commentAttributes = {autoFocus: true, multiline: true /*, textCase: Mojo.Widget.steModeLowerCase*/ };
    this.controller.setupWidget("comment", this.commentAttributes, this.commentModel = {value:""});
};

Mojo.Log.info('loaded(FastComment.js)');

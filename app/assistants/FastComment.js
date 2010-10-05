/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo
*/

function FastCommentAssistant(_a, _cb) {
    this.controller = _a.controller;
    this.cb = _cb;
}

FastCommentAssistant.prototype.setup = function() {
    this.commentAttributes = {autoFocus: true, multiline: true /*, textCase: Mojo.Widget.steModeLowerCase*/ };
    this.controller.setupWidget("comment", this.commentAttributes, this.commentModel = {value:""});

    this.controller.setupWidget('send',   {}, {buttonClass: "affirmative", label: "Send"} );
    this.controller.setupWidget('cancel', {}, {buttonClass: "negative",    label: "Cancel"} );

    Mojo.Event.listen(this.controller.get("send"), Mojo.Event.tap, function() {
        this.cb( this.commentModel.value );

    }.bind(this));

    Mojo.Event.listen(this.controller.get("cancel"), Mojo.Event.tap, function(){

        this.mojo.close();

    }.bind(this));
};

Mojo.Log.info('loaded(FastComment.js)');

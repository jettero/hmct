/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo AMO
*/

function FastCommentAssistant(_a, _cb) {
    this.controller = _a.controller;
    this.cb = _cb;
}

FastCommentAssistant.prototype.setup = function() {
    this.commentAttributes = {autoFocus: true, multiline: true /*, textCase: Mojo.Widget.steModeLowerCase*/ };
    this.controller.setupWidget("comment", this.commentAttributes, this.commentModel = {value:""});
    this.controller.setupWidget("time-worked", this.commentAttributes, this.timeWorkedModel = {value:""});

    this.controller.setupWidget('send',   {}, {buttonClass: "affirmative", label: "Send"} );
    this.controller.setupWidget('cancel', {}, {buttonClass: "negative",    label: "Cancel"} );

    Mojo.Event.listen(this.controller.get("send"), Mojo.Event.tap, function() {
        this.cb( this.commentModel.value, this.timeWorkedModel.value );
        this.mojo.close();

    }.bind(this));

    Mojo.Event.listen(this.controller.get("cancel"), Mojo.Event.tap, function(){

        this.mojo.close();

    }.bind(this));
};

FastCommentAssistant.prototype.activate = function() {
    if( AMO.isCurrentAccountPro() )
        this.controller.get("add-time-worked").removeClassName("generically-hidden");
};

Mojo.Log.info('loaded(FastComment.js)');

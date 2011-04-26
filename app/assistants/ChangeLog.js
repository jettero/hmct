/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo setTimeout $A hex_md5
*/

var CHANGELOG = [
    [ '2011-04-26', '0.9.2', "Added this changelog" ]
];

function ChangeLogAssistant() {
    Mojo.Log.info("ChangeLog()");
    CHANGELOG = $A(CHANGELOG);
}

ChangeLogAssistant.prototype.setup = function() {
    Mojo.Log.info("ChangeLog::setup()");

    var clc = this.clc = new Mojo.Model.Cookie("ChangeLog");
    var clv = clc.get("clv");

    var m = this.m = "K:" + hex_md5(CHANGELOG.each(function(c){ return c.join("-"); }).join("|"));

    this.OKModel          = { label: "OK, I read this.", command: m };
    this.DoneModel        = { label: "Done",             command: m };
    this.commandMenuModel = { label: 'ChangeLog Commands', items: [ ] };

	this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass: 'no-fade'}, this.commandMenuModel);

    if( clv === m ) {
        this.commandMenuModel.items = [ {}, this.Done, {} ];

    } else {
        setTimeout(function(){
            this.commandMenuModel.items = [ {}, this.OKModel, {} ];
            this.controller.modelChanged(this.commandMenuModel);

        }.bind(this), 4e3);
    }
};

ChangeLogAssistant.prototype.handleCommand = function(event) {
    Mojo.Log.info("ChangeLog::handleCommand()");

    if (event.type === Mojo.Event.command) {
        var s_a = event.command.split(/\s*(?:@@)\s*/);

        if( s_a[0].match(/^K:[a-f0-9]{32}$/) ) {
            Mojo.Log.info("ChangeLog::handleCommand() K, read this");
            this.clc.put("clv", s_a[0]);
            Mojo.Log.info("ChangeLog::handleCommand() K, read this(2)");
            this.SC.popScene();
            Mojo.Log.info("ChangeLog::handleCommand() K, read this(3)");
            return;

        } else {
            Mojo.Log.info("ChangeLog::handleCommand(unknown command: %s)", Object.toJSON(s_a));
        }
    }

};

Mojo.Log.info('loaded(ChangeLog.js)');


function PreferencesAssistant() {
    Mojo.Log.info("Preferences()");

    this.SC = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SC.menuSetup.bind(this);

    this.loginListTap  = function(event){ this.SC.showScene("EditAccount");   }.bind(this);
    this.addAccountTap = function(event){ this.SC.showScene("CreateAccount"); }.bind(this);
}

// PreferencesAssistant.prototype.setup = function() {{{
PreferencesAssistant.prototype.setup = function() {
    Mojo.Log.info("Preferences::setup() ");

    this.menuSetup();

    this.loginListAttrs = {
        listTemplate:  'misc/lc1',
        itemTemplate:  'misc/li1',
        emptyTemplate: 'misc/le1',
        addItemLabel:  $L("Add...")
    };

    this.loginList = {listTitle: $L('Hiveminder Logins'), items: []};
    this.controller.setupWidget('hm_login_list', this.loginListAttrs, this.loginList);

    Mojo.Event.listen(this.controller.get('hm_login_list'), Mojo.Event.listTap, this.loginListTap);
    Mojo.Event.listen(this.controller.get('hm_login_list'), Mojo.Event.listAdd, this.addAccountTap);
}
// }}}


function PreferencesAssistant() {
    Mojo.Log.info("Preferences()");

    this.SC = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SC.menuSetup.bind(this);

    this.loginListTap  = function(event){ this.SC.showScene("EditAccount");   }.bind(this);
    this.addAccountTap = function(event){ this.SC.showScene("CreateAccount"); }.bind(this);
}

/* {{{ /**/ PreferencesAssistant.prototype.setup = function() {
    Mojo.Log.info("Preferences::setup()");

    this.menuSetup();

    this.loginListAttrs = {
        listTemplate:  'misc/lc1',
        emptyTemplate: 'misc/le1',
        itemTemplate:  'misc/li-email',
        addItemLabel:  $L("Add...")
    };

    this.loginListModel = {listTitle: $L('Hiveminder Logins'), items: AMO.fetchLoginList() };
    this.controller.setupWidget('hm_login_list', this.loginListAttrs, this.loginListModel);
    AMO.registerLoginList(this.loginListModel, this.controller);

    Mojo.Event.listen(this.controller.get('hm_login_list'), Mojo.Event.listTap, this.loginListTap);
    Mojo.Event.listen(this.controller.get('hm_login_list'), Mojo.Event.listAdd, this.addAccountTap);

};

/*}}}*/

PreferencesAssistant.prototype.activate = function() {
    Mojo.Log.info("Preferences::activate()");
    AMO.registerLoginList(this.loginListModel, this.controller);
};

PreferencesAssistant.prototype.deactivate = function() {
    Mojo.Log.info("Preferences::deactivate()");
    AMO.unregisterLoginList(this.loginListModel, this.controller);
};

Mojo.Log.info('loaded(Preferences.js)');

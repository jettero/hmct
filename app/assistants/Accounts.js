function AccountsAssistant() {
    Mojo.Log.info("Accounts()");
}

// AccountsAssistant.prototype.setup = function() {{{
AccountsAssistant.prototype.setup = function() {
    Mojo.Log.info("Accounts::setup()");

    this.SC = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SC.menuSetup.bind(this);
    this.menuSetup();

    this.innerListAttrs = {
        listTemplate:  'misc/lc1',
        itemTemplate:  'misc/li1',
        emptyTemplate: 'misc/le1',
        addItemLabel:  $L("Add...")
    };

    this.listModel = {listTitle: $L('Hiveminder Logins'), items: []};
    this.controller.setupWidget('hm_login_list', this.innerListAttrs, this.listModel);

    this.listClickHandler     = function(event){this.SC.showScene("EditAccount");   }.bind(this);
    this.createAccountHandler = function(event){this.SC.showScene("CreateAccount"); }.bind(this);

    Mojo.Event.listen(this.controller.get('hm_login_list'), Mojo.Event.listTap, this.listClickHandler);
    Mojo.Event.listen(this.controller.get('hm_login_list'), Mojo.Event.listAdd, this.createAccountHandler);
}
// }}}

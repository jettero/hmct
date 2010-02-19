function CreateAccountAssistant() {
    Mojo.Log.info("CreateAccount()");

    this.SC = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SC.menuSetup.bind(this);
    this.createAccount = this.createAccount.bind(this);
}

// CreateAccountAssistant.prototype.setup = function() {{{
CreateAccountAssistant.prototype.setup = function() {
    Mojo.Log.info("CreateAccount::setup()");

    this.menuSetup();

    var eAttributes = {
        textFieldName: "emailtf",
        hintText: 'email address',
    };

    var pAttributes = {
        textFieldName: "passtf",
        hintText: 'secret password',
    };

    this.eModel = { original: '' };
    this.pModel = { original: '' };

    this.controller.setupWidget('emailtf', eAttributes, this.eModel );
    this.controller.setupWidget('passtf',  pAttributes, this.pModel );

    this.controller.setupWidget('create_button', {type: Mojo.Widget.activityButton}, {label: "Create Account"} );
    Mojo.Event.listen($("create_button"), Mojo.Event.tap, this.createAccount)

    AMO.test();
}
// }}}
// CreateAccountAssistant.prototype.createAccount = function() {{{
CreateAccountAssistant.prototype.createAccount = function() {
    Mojo.Log.info("CreateAccount::createAccount()");
}
// }}}

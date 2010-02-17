function AccountsAssistant() {
    Mojo.Log.info("Accounts()");
}

// AccountsAssistant.prototype.setup = function() {{{
AccountsAssistant.prototype.setup = function() {
    Mojo.Log.info("Accounts::setup()");

    this.SC = Mojo.Controller.stageController.assistant;
    this.menuSetup = this.SC.menuSetup.bind(this);
    this.menuSetup();
}
// }}}

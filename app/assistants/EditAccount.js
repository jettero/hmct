function EditAccountAssistant(args) {
    Mojo.Log.info("EditAccount(email:%s)", args.email);

    this.SC  = Mojo.Controller.stageController;
    this.SCa = this.SC.assistant;

    this.menuSetup       = this.SCa.menuSetup   .bind(this);
    // this.updateAccount   = this.updateAccount   .bind(this);
    // this.checkedUserPass = this.checkedUserPass .bind(this);
    // this.failedUserPass  = this.failedUserPass  .bind(this);
}

Mojo.Log.info('loaded(EditAccount.js)');

function EditAccountAssistant(args) {
    Mojo.Log.info("EditAccount(email:%s)", args.email);

    this.SC  = Mojo.Controller.stageController;
    this.SCa = this.SC.assistant;

    this.originalEmail = args.email;

    this.menuSetup = this.SCa.menuSetup.bind(this);

    this.updateAccount   = this.updateAccount   .bind(this);
    this.checkedUserPass = this.checkedUserPass .bind(this);
    this.failedUserPass  = this.failedUserPass  .bind(this);
}

/* {{{ /**/ EditAccountAssistant.prototype.setup = function() {
    Mojo.Log.info("EditAccount::setup()");

    this.menuSetup();

    var eAttributes = {
        textCase: Mojo.Widget.steModeLowerCase,
        hintText: 'email address',
        textFieldName: "emailtf"
    };

    var pAttributes = {
        hintText: 'secret password',
        textFieldName: "passtf"
    };

    this.originalPasswd = AMO.getPasswdForEmail(this.originalEmail);

    this.eModel = { value: this.originalEmail  };
    this.pModel = { value: this.originalPasswd };

    this.controller.setupWidget('emailtf', eAttributes, this.eModel );
    this.controller.setupWidget('passtf',  pAttributes, this.pModel );

    this.controller.setupWidget('edit_button', {type: Mojo.Widget.activityButton}, {label: "Update Account"} );
    Mojo.Event.listen($("edit_button"), Mojo.Event.tap, this.updateAccount);
};

/*}}}*/
/* {{{ /**/ EditAccountAssistant.prototype.nospin = function(event) {
    $('edit_button').mojo.deactivate();
    this.spinning = false;
};

/*}}}*/
/* {{{ /**/ EditAccountAssistant.prototype.noticedUpdate = function(value) {
    Mojo.Log.info("EditAccount::noticedUpdate(value=%s)", value);
    this.SC.popScene();
};

/*}}}*/

/* {{{ /**/ EditAccountAssistant.prototype.checkedUserPass = function(email, pass, r) {
    Mojo.Log.info("EditAccount::checkedUserPass(email=%s)", email);

    this.nospin();

    AMO.rmAccount(this.emailArg);
    AMO.addReplaceAccount(email,pass,{meta: "data"});

    // 18:00:00: org.voltar.hiveminder: Info: AccountManager::login() r.success
    // r={"success": 1, "content": {}, "action_class": "BTDT::Action::Login",
    // "field_errors": {}, "message": "Welcome back, Paul Miller (work).",
    // "failure": 0, "error": null, "field_warnings": {}}

    if( r.skip_note ) {
        this.noticedUpdate();
        return;
    }

    this.controller.showAlertDialog({
        onChoose: this.noticedUpdate,
        title:    'Account Updated',
        message:  r.message,
        choices:  [ {label: 'OK', value: 'OK', type: 'color'} ]
    });
};

/*}}}*/
/* {{{ /**/ EditAccountAssistant.prototype.failedUserPass = function(e) {
    Mojo.Log.info("EditAccount::failedUserPass()");
    this.nospin();

    return true; // continue with the usual error processing
};

/*}}}*/
/* {{{ /**/ EditAccountAssistant.prototype.updateAccount = function() {
    Mojo.Log.info("EditAccount::updateAccount()");

    var email = this.eModel.value.strip().toLowerCase();
    var pass  = this.pModel.value.strip();

    if( this.spinning ) return;
        this.spinning = true;

    if( email != this.originalEmail || pass != this.originalPasswd ) {
        // we need to check the login to make sure it's still good
        AMO.login(email, pass, this.checkedUserPass, this.failedUserPass);

    } else {
        this.checkedUserPass(email, pass, {skip_note: true, message: "Login credentials unchanged"});
    }
};

/*}}}*/

Mojo.Log.info('loaded(EditAccount.js)');

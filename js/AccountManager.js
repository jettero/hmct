
function AccountManager() {
    Mojo.Log.info("AccountManager()");

    this.accts = {};

    this.login           = this.login.bind(this);
    this.hasAccount      = this.hasAccount.bind(this);
    this.restoreAccounts = this.restoreAccounts.bind(this);
    this.dbRecvAccts     = this.dbRecvAccts.bind(this);
    this.dbRecvAcctsFail = this.dbRecvAcctsFail.bind(this);
    this.dbSentAccts     = this.dbSentAccts.bind(this);
    this.dbSentAcctsFail = this.dbSentAcctsFail.bind(this);

    var options = {
        name:    "HMCTAccounts",
        version: 1,
        replace: false // opening existing if possible
    };

    this.dbo = new Mojo.Depot(options, function(){}, function(t,r){
        Mojo.Controller.errorDialog("Can't open location database (#" + r.message + ").");
    });

    Mojo.Log.info("AccountManager() restoring=true (1)");
    this.restoreAccounts();
}

/* {{{ /**/ AccountManager.prototype.hasAccount = function(email) {
    Mojo.Log.info("AccountManager::hasAccount(email=%s)", email);

    return this.accts[email] ? true : false;

};

/*}}}*/
/* {{{ /**/ AccountManager.prototype.dbSentAccts = function() {
    Mojo.Log.info("AccountManager::dbSentAccts()");

};

/*}}}*/
/* {{{ /**/ AccountManager.prototype.dbSentAcctsFail = function(transaction, error) {
    Mojo.Log.info("AccountManager::dbSentAcctsFail()");
    Mojo.Controller.errorDialog("ERROR storing information (#" + error.message + ").");

};

/*}}}*/
/* {{{ /**/ AccountManager.prototype.addReplaceAccount = function(email,pass) {
    Mojo.Log.info("AccountManager::addReplaceAccount(email=%s)", email);

    this.accts[email] = pass;

    this.dbo.simpleAdd("accts", this.accts, this.dbSendAccts, this.dbSendAcctsFail);
};

/*}}}*/
/* {{{ /**/ AccountManager.prototype.login = function(email,pass,s,f) {
    Mojo.Log.info("AccountManager::login(email=%s)", email);

    if( !s ) s = function() { return true; }.bind(this);
    if( !f ) f = function() { return true; }.bind(this);

    var request = new Ajax.Request('https://hiveminder.com/=/action/BTDT.Action.Login.json', {
        method: 'post', parameters: { address: email, password: pass }, evalJSON: true,

        onSuccess: function(transport) {
            if( transport.status == 200 ) {
                var r = transport.responseJSON;
                if( r ) {
                    if( r.success ) {
                        Mojo.Log.info("AccountManager::login() r.success r=%s", Object.toJSON(r));
                        s(email, pass, r);

                    } else {
                        Mojo.Log.info("AccountManager::login() r.fail, r=%s", Object.toJSON(r));
                        var e = [];

                        if( r.error )
                            e.push($L(r.error));

                        for(var k in r.field_errors )
                            e.push($L(k + "-error: " + r.field_errors[k]));

                        if( !e.length )
                            e.push($L("Something went wrong with the login ..."));

                        if( f(e) )
                            Mojo.Controller.errorDialog(e.join("... "));
                    }

                } else {
                    Mojo.Log.info("AccountManager::login() sent [kinda bad]: r=%s", Object.toJSON(r));
                    var e = ["Unknown error issuing hiveminder login, huh"];

                    if( f(e) )
                        Mojo.Controller.errorDialog(e.join("... "));
                }

            } else {
                Mojo.Log.info("AccountManager::login() sent [kinda bad]: transport=%s", Object.toJSON(transport));
                var e = ["Unknown error issuing hiveminder login -- host not found?"];

                if( f(e) )
                    Mojo.Controller.errorDialog(e.join("... "));
            }

        }.bind(this),

        onFailure: function(transport) {
            var t = new Template($L("Ajax Error: #{status}"));
            var m = t.evaluate(transport);
            var e = [m];

            if( f(e) )
                Mojo.Controller.errorDialog(e.join("... "));

        }.bind(this)

    });

};

/*}}}*/
/* {{{ /**/ AccountManager.prototype.dbRecvAccts = function(accts) {
    Mojo.Log.info("AccountManager::dbRecvAccts()");

    if( accts === null )
        return;

    this.accts = accts;

    for( var k in accts )
        Mojo.Log.info("restored acct: %s", k);

};

/*}}}*/
/* {{{ /**/ AccountManager.prototype.dbRecvAcctsFail = function(transaction, error) {
    Mojo.Log.info("AccountManager::dbRecvAcctsFail()");
    Mojo.Controller.errorDialog("ERROR restoring account information (#" + error.message + ").");

};

/*}}}*/
/* {{{ /**/ AccountManager.prototype.restoreAccounts = function() {
    Mojo.Log.info("AccountManager::restoreAccounts()");
    this.dbo.simpleGet("accts", this.dbRecvAccts, this.dbRecvAcctsFail);

};

/*}}}*/

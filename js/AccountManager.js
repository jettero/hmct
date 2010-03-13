/*jslint white: false, onevar: false
*/
/*global Mojo AjaxDRY Template BBO
*/

/* {{{ */ function AccountManager() {
    Mojo.Log.info("AccountManager()");

    this.data = { version: 2, meta: {}, accts: {} };

    this.dbRecv     = this.dbRecv.bind(this);
    this.dbRecvFail = this.dbRecvFail.bind(this);
    this.dbSent     = this.dbSent.bind(this);
    this.dbSentFail = this.dbSentFail.bind(this);

    this.loginChangeCallbacks = [];
    this.acdetChangeCallbacks = [];

    var options = {
        name:    "HMCTAccounts",
        version: 1,
        replace: false // opening existing if possible
    };

    this.dbo = new Mojo.Depot(options, function(){}, function(t,r){
        Mojo.Controller.errorDialog("Can't open location database (#" + r.message + ").");
    });

    Mojo.Log.info("AccountManager() restoring=true (1)");

    // setTimeout(this.dbRestore.bind(this), 3500); // sometimes it's handy to wait for testing purposes
    this.dbRestore();

    this.db_loaded = false; // got the db picked upt
    this.loaded = false; // fully loaded
}

/*}}}*/

/* {{{ */ AccountManager.prototype.dbChanged = function(desc) {
    Mojo.Log.info("AccountManager::dbChanged(desc=%s)", desc);

    this.dbo.add("am_data", this.data, this.dbSent, this.dbSentFail);
};

/*}}}*/
/* {{{ */ AccountManager.prototype.dbSent = function() {
    Mojo.Log.info("AccountManager::dbSent()");
};

/*}}}*/
/* {{{ */ AccountManager.prototype.dbSentFail = function(transaction, error) {
    Mojo.Log.info("AccountManager::dbSentFail()");
    Mojo.Controller.errorDialog("ERROR storing information (#" + error.message + ").");

};

/*}}}*/
/* {{{ */ AccountManager.prototype.addReplaceAccount = function(email,pass) {
    Mojo.Log.info("AccountManager::addReplaceAccount(email=%s)", email);

    this.data.accts[email] = pass;
    this.dbChanged("added login");
};

/*}}}*/
/* {{{ */ AccountManager.prototype.rmAccount = function(email) {
    Mojo.Log.info("AccountManager::rmAccount(email=%s)", email);

    delete this.data.accts[email];

    if( this.data.meta.currentLogin === email )
        delete this.data.meta.currentLogin;

    this.dbChanged("removed login");
};

/*}}}*/

/* {{{ */ AccountManager.prototype.hasAccount = function(email) {
    Mojo.Log.info("AccountManager::hasAccount(email=%s)", email);

    return this.data.accts[email] ? true : false;

};

/*}}}*/
/* {{{ */ AccountManager.prototype.fetchLoginList = function() {
    Mojo.Log.info("AccountManager::fetchLoginList()");

    var ret = [];
    for( var k in this.data.accts )
        ret.push({email: k});

    return ret;

};

/*}}}*/
/* {{{ */ AccountManager.prototype.getPasswdForEmail = function(email) {
    Mojo.Log.info("AccountManager::getPasswdForEmail(email:%s)", email);

    return this.data.accts[email];

};

/*}}}*/
/* {{{ */ AccountManager.prototype.login = function(email,pass,s,f) {
    Mojo.Log.info("AccountManager::login(email=%s)", email);

    if( !s ) s = function() {};
    if( !f ) f = function() {};

    var me = this;

    if( this.l_req ) {
        Mojo.Log.info("AccountManager::login() [canceling previous request]");

        try {
            this.l_req.abort();
        }

        catch(e) {
            Mojo.Log.info("AccountManager::login() [problem canceling previous request: %s]", e);
        }
    }

    BBO.busy("login change");

    // AjaxDRY(desc,url,method,params,success,failure);
    this.l_req = new AjaxDRY("AccountManager::login()", 'https://hiveminder.com/=/action/Login.json',
        "post", { address: email, password: pass },

        function(r) {
            delete me.l_req;
            BBO.done("login change");

            if( r.success ) {
                Mojo.Log.info("AccountManager::login() r.success r=%s", Object.toJSON(r));

                me.getAccountDetails();
                me.data.meta.currentLogin = email;
                me.dbChanged("new current login");

                s(email, pass, r);
                this.notifyAcctsChange();

            } else {
                Mojo.Log.info("AccountManager::login() r.fail, r=%s", Object.toJSON(r));

                if( f() ) {
                    var e = [];

                    if( r.error )
                        e.push(r.error);

                    for(var k in r.field_errors )
                        e.push(k + "-error: " + r.field_errors[k]);

                    if( !e.length )
                        e.push("Something went wrong with the login ...");

                    Mojo.Controller.errorDialog(e.join("... "));
                }
            }
        },

        function() {
            delete me.l_req;
            BBO.done("login change");
        }
    );

};

/*}}}*/
/* {{{ */ AccountManager.prototype.switchTo = function(email) {
    Mojo.Log.info("AccountManager::switchTo(email=%s)", email);

    var passwd = this.getPasswdForEmail(email);

    if( passwd )
        this.login( email, passwd );
};

/*}}}*/
/* {{{ */ AccountManager.prototype.getLoginCount = function() {
    var ret = 0;

    if( this.loaded ) {
        for( var e in this.data.accts )
            ret ++;

    } else {
        ret = -1;
    }

    Mojo.Log.info("AccountManager::getLoginCount() [%d]", ret);

    return ret;

};

/*}}}*/

AccountManager.prototype.getAccountDetails = function() {
    Mojo.Log.info("AccountManager::getAccountDetails()");

    delete this.data.meta.accountDetails;

    if( this.d_req ) {
        Mojo.Log.info("AccountManager::getAccountDetails() [canceling previous request]");

        try {
            this.d_req.abort();
        }

        catch(e) {
            Mojo.Log.info("AccountManager::getAccountDetails() [problem canceling previous request: %s]", e);
        }
    }

    BBO.busy("fetching account details");
    var url = "http://hiveminder.com/=/model/user/email/" + this.data.meta.currentLogin + ".json";
    var me = this;

    // AjaxDRY(desc,url,method,params,success,failure);
    this.d_req = new AjaxDRY("AccountManager::getAccountDetails()", url, "get", {},
        function(r) {
            Mojo.Log.info("AccountManager::getAccountDetails() [success] r=%s", Object.toJSON(r));
            delete me.d_req;
            BBO.done("fetching account details");
            this.data.meta.accountDetails = r;
        },

        function() {
            Mojo.Log.info("AccountManager::getAccountDetails() [fail]");
            delete me.d_req;
            BBO.done("fetching account details");
        }
    );
};

/* {{{ */ AccountManager.prototype.dbRecv = function(data) {
    Mojo.Log.info("AccountManager::dbRecv()");

    this.db_loaded = true;
    Mojo.Log.info("AMO.db_loaded=true");

    if( data === null ) {
        this.loaded = true; // there's nothing to tell anyone about it though...
        return;
    }

    switch( data.version ) {
        default:
            this.data = data;
            break;
    }

    for( var k in this.data.accts )
        Mojo.Log.info("restored acct: %s", k);

    Mojo.Log.info("currently logged in: %s", data.meta.currentLogin);

    this.notifyAcctsChange();

};

/*}}}*/
/* {{{ */ AccountManager.prototype.dbRecvFail = function(transaction, error) {
    Mojo.Log.info("AccountManager::dbRecvFail()");
    Mojo.Controller.errorDialog("ERROR restoring account information (#" + error.message + ").");

};

/*}}}*/
/* {{{ */ AccountManager.prototype.dbRestore = function() {
    Mojo.Log.info("AccountManager::dbRestore()");
    this.dbo.get("am_data", this.dbRecv, this.dbRecvFail);

};

/*}}}*/

/* {{{ */ AccountManager.prototype.registerLoginChange = function(callback) {
    Mojo.Log.info("AccountManager::registerLoginChange()");

    this.loginChangeCallbacks.push(callback);
    this.notifyAcctsChangeStep(callback);
};

/*}}}*/
/* {{{ */ AccountManager.prototype.unregisterLoginChange = function(callback) {
    Mojo.Log.info("AccountManager::unregisterLoginChange()");

    this.loginChangeCallbacks = this.loginChangeCallbacks.reject(function(_c){ return _c === callback; });
};

/*}}}*/
/* {{{ */ AccountManager.prototype.notifyAcctsChangeStep = function(callback) {
    Mojo.Log.info("AccountManager::notifyAcctsChangeStep()");

    var emails  = [];
    var current = this.data.meta.currentLogin;

    for( var e in this.data.accts ) {
        var i = {email: e};

        if( e === current )
            i.current = true;

        emails.push(i);
    }

    callback(emails, current);
};

/*}}}*/
/* {{{ */ AccountManager.prototype.notifyAcctsChange = function() {
    Mojo.Log.info("AccountManager::notifyAcctsChange()");

    for( var i=0; i<this.loginChangeCallbacks.length; i++ )
        this.notifyAcctsChangeStep(this.loginChangeCallbacks[i]);

    if( this.db_loaded ) {
        this.loaded = true; // got the db picked up and told everything about it
        Mojo.Log.info("AMO.loaded=true");
    }
};

/*}}}*/

Mojo.Log.info('loaded(AccountManager.js)');

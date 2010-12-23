/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo REQ Template ErrorDialog $A
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
    this.srchlChangeCallbacks = [];
    this.srchgChangeCallbacks = [];

    var options = {
        name:    "HMCTAccounts",
        version: 1,
        replace: false // opening existing if possible
    };

    this.e = new ErrorDialog("AccountManager");
    this.E = this.e.showError;

    this.dbo = new Mojo.Depot(options, function(){}, function(t,r){
        this.E(false, "depot", "Can't open location database (#" + r.message + ").");
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
    this.E("dbSentFail", "login", "ERROR storing information (#" + error.message + ").");

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
    this.notifyAcctsChange();
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
/* {{{ */ AccountManager.prototype.login = function(email, pass, success, fail, force) {
    Mojo.Log.info("AccountManager::login(email=%s)", email);

    if( !success ) success = function() {};
    if( !fail    ) fail    = function() {return true;};

    this.clearAccountDetails();
    this.clearSearchLists();
    this.clearSearchGroups();

    REQ.bankrupt(); // cancel all running and queued requests

    var me = this;

    REQ.doRequest({
        desc:    'AccountManager::login(' + email + ')',
        url:     'https://hiveminder.com/=/action/Login.json',
        method:  'post',
        params:  { address: email, password: pass },

        success: function(r) {

            if( r.success )
                return true;

            Mojo.Log.info("AccountManager::login() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            if( fail() ) {
                var e = [];

                if( r.error ) {
                    if( r.error.match(/password/i) ) {
                        me.E("login", "login", r.error, function(){
                            Mojo.Controller.stageController.assistant.showScene("Preferences");
                        });
                        return false;
                    }

                    e.push(r.error);
                }

                for(var k in r.field_errors )
                    e.push(k + "-error: " + r.field_errors[k]);

                if( !e.length )
                    e.push("Something went wrong with the login ...");

                me.E("login", "login", e.join("; "));
            }

            return false;
        },

        finish:  function(r) {
            Mojo.Log.info("AccountManager::login() r.success");

            me.data.meta.currentLogin = email;
            me.dbChanged("new current login");
            me.notifyAcctsChange();
            me.getAccountDetails(force);

            success(email, pass, r);
        }
    });

};

/*}}}*/
/* {{{ */ AccountManager.prototype.switchTo = function(email) {
    Mojo.Log.info("AccountManager::switchTo(email=%s)", email);

    var passwd = this.getPasswdForEmail(email);

    if( passwd )
        this.login( email, passwd );
};

/*}}}*/
/* {{{ */ AccountManager.prototype.refreshCurrentLogin = function() {
    Mojo.Log.info("AccountManager::refreshCurrentLogin()");

    if( !this.data.meta.currentLogin ) {
        this.E("refreshCurrentLogin", "login", "Please log in first...");
        return;
    }

    var e = this.data.meta.currentLogin;
    this.login( e, this.getPasswdForEmail(e), null, null, true );

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

/* {{{ */ AccountManager.prototype.clearAccountDetails = function() {
    delete this.data.meta.acdet;
    this.notifyAcdetChange();
};

/*}}}*/
/* {{{ */ AccountManager.prototype.getAccountDetails = function(force) {
    Mojo.Log.info("AccountManager::getAccountDetails(force: %s)", force ? "true" : "false");

    this.clearAccountDetails();

    var email = this.data.meta.currentLogin;

    if( !email )
        return;

    var url = "https://hiveminder.com/=/model/user/email/" + email + ".json";
    var me = this;

    REQ.doRequest({ desc: 'AccountManager::getAccountDetails('+email+')', url: url, method: 'get',

        cacheable: true, // uses desc as keystrings by default
        force: force,
        // cacheMaxAgeOverride: 787, // how many seconds is too old... should we override?

        process: function(r) {
            r.pro_account            = parseInt(r.pro_account, 10)            ? true:false; // parseBoolean
            r.calendar_starts_monday = parseInt(r.calendar_starts_monday, 10) ? true:false;
            r.was_pro_account        = parseInt(r.was_pro_account, 10)        ? true:false;
            r.beta_features          = parseInt(r.beta_features, 10)          ? true:false;

            return r;
        },

        finish: function(r) {
            Mojo.Log.info("AccountManager::getAccountDetails() [success]");

            me.data.meta.acdet = r;
            me.dbChanged("account details updated");
            me.notifyAcdetChange(force);
        }
    });
};

/*}}}*/
/* {{{ */ AccountManager.prototype.clearSearchLists = function() {
    delete this.data.meta.srchl;
    this.notifySrchlChange();
};

/*}}}*/
/* {{{ */ AccountManager.prototype.getSearchLists = function(force) {
    this.clearSearchLists();

    var email = this.data.meta.currentLogin;
    if( !email )
        return;

    if( !this.isCurrentAccountPro() ) {
        Mojo.Log.info("AccountManager::getSearchLists() [skipping fetch, not a pro account]");
        return;
    }

    var me = this;

    REQ.doRequest({ desc: 'AccountManager::getSearchLists('+email+')', method: 'post',
        url: "https://hiveminder.com/=/action/SearchList.json", params: {post: "please"},

        cacheable: true, // uses desc as keystrings by default
        force: force,   // by always forcing... in effect, we accept the cache entry, but then look for new data anyway
        // cacheMaxAgeOverride: 787, // how many seconds is too old... should we override?

        process: function(r) {
            var ret = [];

            if( !r.content ) return ret;
            if( !r.content.search ) return ret;

            return r.content.search; /*

                see yml/search_list.yml

                [ { owner: user_id, created: Date, tokens: "blarg blarg", name: "Blarg!", id: row_id }, ... ]

            */
        },

        finish: function(r) {
            Mojo.Log.info("AccountManager::getSearchLists() [success]");

            me.data.meta.srchl = r;
            me.dbChanged("search lists updated");
            me.notifySrchlChange();
        },

        success: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("AccountManager::getSearchLists() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong while trying to fetch the search lists for: " + email);

            me.E("getSearchLists", "details", e.join("; "));

            return false;
        }
    });
};

/*}}}*/
/* {{{ */ AccountManager.prototype.clearSearchGroups = function() {
    delete this.data.meta.srchg;
    this.notifySrchgChange();
};

/*}}}*/
/* {{{ */ AccountManager.prototype._old_getSearchGroups = function(force) {
    this.clearSearchGroups();

    /* this version of getSearchGroups() DISABLED 2010-12-20 ...
    **
    ** On Mon, Nov 8, 2010 at 12:49 PM, Thomas Sibley wrote:
    ** > Ah, you've hit an unoptimized autogenerated action. When you don't
    ** > provide it with a field to limit on, it's fetching all the rows in the
    ** > groups table and then filtering them down to the ones you can see. It
    ** > should be limiting to groups you can see as part of the query.
    ** >
    ** > In the meantime, you might try the SearchGroupMembers action and specify
    ** > the current user's id for the actor_id field. That'll return a bunch of
    ** > group_ids you can use to lookup group info. It's more hits, but
    ** > probably faster anyways.
    */

    var email = this.data.meta.currentLogin;
    if( !email )
        return;

    var me = this;

    REQ.doRequest({ desc: 'AccountManager::getSearchGroups('+email+')', method: 'post',
        url: "https://hiveminder.com/=/action/SearchGroup.json", params: {post: "please"},

        cacheable: true, // uses desc as keystrings by default
        force: force,   // by always forcing... in effect, we accept the cache entry, but then look for new data anyway
        // cacheMaxAgeOverride: 787, // how many seconds is too old... should we override?

        process: function(r) {
            var ret = [];

            if( !r.content ) return ret;
            if( !r.content.search ) return ret;

            return r.content.search; /*

                see yml/search_group.yml

                [ { broadcast_comments: 1, description: "Tasks Relating to the HMCT webos app.",
                        id: 8448, name: 'HMCT' }, ... ]

            */
        },

        finish: function(r) {
            Mojo.Log.info("AccountManager::getSearchGroups() [success]");

            me.data.meta.srchg = r;
            me.dbChanged("search groups updated");
            me.notifySrchgChange();
        },

        success: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("AccountManager::getSearchGroups() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong while trying to fetch the search groups for: " + email);

            me.E("getSearchGroups", "details", e.join("; "));

            return false;
        }
    });
};

/*}}}*/
/* {{{ */ AccountManager.prototype.getSearchGroups = function(force) {
    if( !this.data.meta.acdet )
        return;

    var id    = this.data.meta.acdet.id;
    var email = this.data.meta.currentLogin;

    if( !email || !id )
        return;

    var me = this;

    REQ.doRequest({ desc: 'AccountManager::getSearchGroups(' + email + ',' + id + ')', method: 'post',
        url: "https://hiveminder.com/=/action/SearchGroupMember.json", params: {actor_id: id},

        cacheable: true,
        force: force,

        process: function(r) {
            var ret = [];

            if( r.content )
                if( r.content.search )
                    $A( r.content.search ).each(function(i){ ret.push(i.group_id); });

            return ret;
        },

        finish: function(r) {
            Mojo.Log.info("AccountManager::getSearchGroups() [success]");
            me.clearSearchGroups();
            $A(r).each(function(i){
                me._getSearchGroup(force, i);
            });
        },

        success: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("AccountManager::getSearchGroups() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong while trying to fetch the search groups for: " + email);

            me.E("getSearchGroups", "details", e.join("; "));

            return false;
        }
    });
};

/*}}}*/
/* {{{ */ AccountManager.prototype._getSearchGroup = function(force, group_id) {

    var me = this;

    if( group_id.match(/^$/) ) {
        Mojo.Log.info("AccountManager::_getSearchGroup(group_id=%s) [too weird for me]", group_id);
        return;
    }

    REQ.doRequest({ desc: 'AccountManager::_getSearchGroup(group_id=' + group_id + ')', method: 'get',
        url: "http://hiveminder.com/=/model/Group/id/" + group_id + ".json",

        cacheable: true,
        force: force,

        process: function(r) {
            var ret = {};

            if( r.id )
                ret = r;

            return ret;
        },

        finish: function(r) {
            if( r.id ) {
                Mojo.Log.info("AccountManager::_getSearchGroup() [success]");

                if( !me.data.meta.srchg )
                    me.data.meta.srchg = [];

                me.data.meta.srchg.push(r);
                me.dbChanged("search groups updated");
                me.notifySrchgChange();

            } else {
                Mojo.Log.info("AccountManager::_getSearchGroup() [success/fail, no id found, meh]");
            }
        },

        success: function(r) {
            if( typeof r !== "object" )
                r = {};

            if( r.id )
                return true;

            Mojo.Log.info("AccountManager::_getSearchGroup() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong while trying to fetch the search groups for: " + group_id);

            me.E("_getSearchGroup", "details", e.join("; "));

            return false;
        }
    });
};

/*}}}*/
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
    this.notifyAcdetChange();

};

/*}}}*/
/* {{{ */ AccountManager.prototype.dbRecvFail = function(transaction, error) {
    this.E("dbRecvFail", "depot", "ERROR restoring account information (#" + error.message + ")");

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

/* {{{ */ AccountManager.prototype.registerAcdetChange = function(callback) {
    Mojo.Log.info("AccountManager::registerAcdetChange()");

    if( !this.data.meta.acdet ) // if we don't have details
        if( this.acdetChangeCallbacks.length === 0 ) // and this is the first registration
            this.getAccountDetails(); // go get them

    this.acdetChangeCallbacks.push(callback);
    this.notifyAcdetChangeStep(callback);
};

/*}}}*/
/* {{{ */ AccountManager.prototype.unregisterAcdetChange = function(callback) {
    Mojo.Log.info("AccountManager::unregisterAcdetChange()");

    this.acdetChangeCallbacks = this.acdetChangeCallbacks.reject(function(_c){ return _c === callback; });
};

/*}}}*/
/* {{{ */ AccountManager.prototype.notifyAcdetChangeStep = function(callback) {
    Mojo.Log.info("AccountManager::notifyAcdetChangeStep()");

    callback(this.data.meta.acdet);
};

/*}}}*/
/* {{{ */ AccountManager.prototype.notifyAcdetChange = function(force) {
    Mojo.Log.info("AccountManager::notifyAcdetChange(force: %s)", force ? "true" : "false");

    for( var i=0; i<this.acdetChangeCallbacks.length; i++ )
        this.notifyAcdetChangeStep(this.acdetChangeCallbacks[i]);

    if( this.srchlChangeCallbacks.length >= 0 )
        this.getSearchLists(force);

    if( this.srchgChangeCallbacks.length >= 0 )
        this.getSearchGroups(force);
};

/*}}}*/
/* {{{ */ AccountManager.prototype.isCurrentAccountPro = function() {
    if( this.data.meta.acdet ) {
        if( this.data.meta.acdet.pro_account ) {
            Mojo.Log.info("AccountManager::isCurrentAccountPro() [yes]");
            return true;
        }
    }

    Mojo.Log.info("AccountManager::isCurrentAccountPro() [no]");
    return false;
};

/*}}}*/

/* {{{ */ AccountManager.prototype.registerSrchlChange = function(callback) {
    Mojo.Log.info("AccountManager::registerSrchlChange()");

    if( !this.data.meta.srchl ) // if we don't have the lists
        if( this.srchlChangeCallbacks.length === 0 ) // and this is the first registration
            this.getSearchLists(); // go get them

    this.srchlChangeCallbacks.push(callback);
    this.notifySrchlChangeStep(callback);
};

/*}}}*/
/* {{{ */ AccountManager.prototype.unregisterSrchlChange = function(callback) {
    Mojo.Log.info("AccountManager::unregisterSrchlChange()");

    this.srchlChangeCallbacks = this.srchlChangeCallbacks.reject(function(_c){ return _c === callback; });
};

/*}}}*/
/* {{{ */ AccountManager.prototype.notifySrchlChangeStep = function(callback) {
    Mojo.Log.info("AccountManager::notifySrchlChangeStep()");

    callback(this.data.meta.srchl);
};

/*}}}*/
/* {{{ */ AccountManager.prototype.notifySrchlChange = function() {
    Mojo.Log.info("AccountManager::notifySrchlChange()");

    for( var i=0; i<this.srchlChangeCallbacks.length; i++ )
        this.notifySrchlChangeStep(this.srchlChangeCallbacks[i]);
};

/*}}}*/

/* {{{ */ AccountManager.prototype.registerSrchgChange = function(callback) {
    Mojo.Log.info("AccountManager::registerSrchgChange()");

    if( !this.data.meta.srchg ) // if we don't have the lists
        if( this.srchgChangeCallbacks.length === 0 ) // and this is the first registration
            this.getSearchGroups(); // go get them

    this.srchgChangeCallbacks.push(callback);
    this.notifySrchgChangeStep(callback);
};

/*}}}*/
/* {{{ */ AccountManager.prototype.unregisterSrchgChange = function(callback) {
    Mojo.Log.info("AccountManager::unregisterSrchgChange()");

    this.srchgChangeCallbacks = this.srchgChangeCallbacks.reject(function(_c){ return _c === callback; });
};

/*}}}*/
/* {{{ */ AccountManager.prototype.notifySrchgChangeStep = function(callback) {
    Mojo.Log.info("AccountManager::notifySrchgChangeStep()");

    callback(this.data.meta.srchg);
};

/*}}}*/
/* {{{ */ AccountManager.prototype.notifySrchgChange = function() {
    Mojo.Log.info("AccountManager::notifySrchgChange()");

    for( var i=0; i<this.srchgChangeCallbacks.length; i++ )
        this.notifySrchgChangeStep(this.srchgChangeCallbacks[i]);
};

/*}}}*/

Mojo.Log.info('loaded(AccountManager.js)');

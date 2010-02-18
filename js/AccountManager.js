
function test() {
    Mojo.Log.info("AccountManager::test()");
}

function AccountManager() {
    Mojo.Log.info("AccountManager()");

    this.test = test.bind(this);
}

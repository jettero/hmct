/*jslint white: false, onevar: false
*/
/*global $ Mojo
*/

function BusyBee() {
    this.tasks = {};

    Mojo.Event.listen($("wait"), Mojo.Event.tap, this.showDetail.bind(this));
}

BusyBee.prototype.showDetail = function() {
    Mojo.Log.info("BusyBee::showDetail()");

    if( this.showing ) {
        $("wait-detail").setStyle({display: 'none'});
        this.showing = false;

    } else {
        $("wait-detail").setStyle({display: 'block'});
        this.showing = true;
    }
};

BusyBee.prototype.busy = function(task) {
    Mojo.Log.info("BusyBee::busy(%s)", task);

    this.tasks[task] = true;

    $("wait").setStyle({display: 'block'});
    if( this.showing )
        $("wait-detail").setStyle({display: 'block'});
};                                                                                                                             

BusyBee.prototype.done = function(task) {
    Mojo.Log.info("BusyBee::done(%s)", task);

    delete this.tasks[task];

    for( var k in this.tasks ) {
        Mojo.Log.info("BusyBee::done() [tasks remaining]");
        return;
    }

    Mojo.Log.info("BusyBee::done() [all done, hiding bee]");

    $("wait").setStyle({display: 'none'});
    $("wait-detail").setStyle({display: 'none'});
};  

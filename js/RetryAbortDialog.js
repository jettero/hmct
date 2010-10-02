/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo Template
*/

function RetryAbortDialog(launcher) {
    this.logTemplate = new Template(launcher + "#{fname}() [#{desc}]: #{message}");
    this.showRetry = this.showRetry.bind(this);
}

RetryAbortDialog.prototype.showRetry = function(fname,desc,message,cb) {
    var o = {desc: desc, message: message};

    if( fname ) o.fname = "::" + fname;
    else        o.fname = "";

    Mojo.Log.info( this.logTemplate.evaluate(o) );

    return Mojo.Controller.stageController.topScene().showAlertDialog({
		onChoose: function(value) {try{cb(value);}catch(e){}},
		title:    'Error',
		message:  message,
		choices: [
            {label:'Retry',  value:'retry', type:'affirmative'},
            {label:'Abort',  value:'abort', type:'negative'},
            {label:'Keep Waiting', value:'wait'}
        ]
	});
};

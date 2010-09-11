/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo Template
*/

function SuccessDialog(launcher,controller) {
    this.logTemplate = new Template(launcher + "#{fname}() [#{desc}]: #{message}");
    this.showSuccess = this.showSuccess.bind(this);
    this.controller  = controller;
}

SuccessDialog.prototype.showSuccess = function(fname,desc,message) {
    var o = {desc: desc, message: message};

    if( fname ) o.fname = "::" + fname;
    else        o.fname = "";

    Mojo.Log.info( this.logTemplate.evaluate(o) );
    this.controller.showAlertDialog({
		onChoose: function(value) {},
		title:    'Success',
		message:  message,
		choices: [ {label:'OK', value:'OK', type:'color'} ]
	});
};

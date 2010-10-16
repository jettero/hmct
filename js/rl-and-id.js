/* /usr/local/share/perl/5.10.1/Number/RecordLocator.pm */

var CHAR_TO_INT = {};
var INT_TO_CHAR = {};

init_rl_maps();

function init_rl_maps() {
    var ca = ("23456789"+"A"+"CDEFGHIJKLMNOPQR"+"TUVwXYZ").split("");
    var counter = 0;
    var CHAR_REMAP  = {
        '0':'O',
        '1':'I',
        'S':'F',
        'B':'P',
    };

    for(var i=0; i<ca.length; i++) {
        CHAR_TO_INT[ca[i]] = counter;
        INT_TO_CHAR[counter] = ca[i];
        counter ++;
    }

    for(var k in CHAR_REMAP)
        CHAR_TO_INT[k] = CHAR_TO_INT[ CHAR_REMAP[k] ];
}

function rl2id(rl) {
    rl = rl.toUpperCase().split("");

    var id = 0;
    var c;

    for(var i=0; i<rl.length; i++) {
        c = CHAR_TO_INT[rl[i]];

        if( c == null ) // STFU: I mean null or undef here
            return "";

        id = (id * 32) + c;
    }

    return id;
}

function id2rl(id) {
    id = parseInt(id);

    var n = [];
    while(id != 0) {
        n.unshift( id % 32 );
        id = parseInt(id/32);
    }

    var rl = "";
    for(var i=0; i<n.length; i++)
        rl += INT_TO_CHAR[n[i]];

    return rl;
}

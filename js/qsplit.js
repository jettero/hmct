/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/

// parse:  "tag \"list\" about \"stuff with spaces\""
// return: ["\"tag\"","\"list\"","\"about\"","\"stuff with spaces\""]
/* {{{ */ function qsplit(x,nq) {
    var r = [];
    var i,e;
    var ok;
    var first_step;

    x = x.split(/[ \t]/);
    for(i=0; i<x.length; i++) {
        if( x[i].match(/"/) ) {

            if( !x[i].match(/^"[^"]+"?$/) )
                return false;

            r.push("");
            e = r.length-1;

            ok = false;
            first_step = true;
            for(; i<x.length; i++) {

                r[e] += first_step ? x[i] : " " + x[i];

                if( r[e].match(/^"[^"]+"$/) ) {
                    ok = true;
                    break;

                } else if( x[i].match(/"/) && !first_step ) {
                    return false;
                }

                first_step = false;
            }

            if( !ok )
                return false;

        } else {
            if( nq ) r.push( x[i] );
            else     r.push( '"' + x[i] + '"' );
        }
    }

    return r;
}

/*}}}*/

// process: ["\"tag\"","\"list\"","\"about\"","\"stuff with spaces\""]
// return:  "tag list about \"stuff with spaces\"";
/* {{{ */ function revqsplit(ar) {

    for(var i=0; i<ar.length; i++) {
        if( ar[i].match(/^"[^"\s]+"$/) )
            ar[i] = ar[i].replace(/^"/, "").replace(/"$/, "");
    }

    return ar.join(" ");
}

/*}}}*/

// just like qsplit, but without the inner quotes
function nqsplit(x) { return qsplit(x,true); }

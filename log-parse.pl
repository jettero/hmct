#!/usr/bin/perl

use strict;
use Time::Local qw(timegm_nocheck);
use POSIX qw(strftime);

my $old = select STDIN; $| = 1;
select $old; $| = 1;

my @start = ( map { strftime('%H:%M:%S', gmtime(time() + $_)) } (0,-1,+1) );
my $start = do { local $" = "|"; qr(@start) };

my $on = 0;

while(<STDIN>) {
    $on = 1 if m/$start.*?Info.*?loaded\(\w+\.js\)/;

    if( s/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).+?LunaSysMgr.*?{LunaSysMgrJS}:\s+// ) {
        my ($year, $month, $day, $hour, $min, $sec) = ($1, $2, $3, $4, $5, $6);
        $month =~ s/^0//; $month --;
        my $esec = timegm_nocheck($sec,$min,$hour,$day,$month,$year);
        my $time = strftime('%H:%M:%S', localtime($esec));

        s(, file://.*)();

        print "$time: $_" if $on;
    }
}


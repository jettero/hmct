#!/usr/bin/perl

use strict;
use Time::Local qw(timegm_nocheck);
use POSIX qw(strftime);

$SIG{INT} = sub { print "\nbye\n"; exit 0 };

my $old = select STDIN; $| = 1;
select $old; $| = 1;

my @start = ( map { strftime('%H:%M:%S', gmtime(time() + $_)) } (0,-1,+1) );
my $start = do { local $" = "|"; qr(@start) };

my $on = $ENV{ALWAYS_ON} | $ENV{ALL};

open my $dump, ">", "last_run.log" or die $!;

{ my $old = select STDIN; $| = 1; select $old }

# 2010-03-07T20:12:11.629669Z [7101] palm-webos-device user.info powerd: {powerd}:
my $reg = qr|^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).+?LunaSysMgr.*?{LunaSysMgrJS}:\s+|;
   $reg = qr|^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).+?\[\d+\] \S+ \S+ |;

while(<STDIN>) {
    $on = 1 if m/$start.*?Info.*?loaded\(\w+\.js\)/;

    if( s/$reg// ) {
        my ($year, $month, $day, $hour, $min, $sec) = ($1, $2, $3, $4, $5, $6);
        $month =~ s/^0//; $month --;
        my $esec = timegm_nocheck($sec,$min,$hour,$day,$month,$year);
        my $time = strftime('%H:%M:%S', localtime($esec));

        s(, file://.*)();
        s(, palmInitFramework\d+:\d+)();

        if( $on ) {
            print       "$time: $_";
            print $dump "$time: $_";
        }

    }
}


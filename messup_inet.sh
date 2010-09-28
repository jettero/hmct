#!/bin/bash

set -e

echo 1. DROP hiveminder.org
echo 2. REJECT hiveminder.org
echo 3. clearup any trouble

echo -n '[1-3] '
read X

old=$(sudo iptables --line -nL OUTPUT | grep hiveminder) || /bin/true

if [ -n "$old" ]; then
    sudo iptables -D OUTPUT $(echo $old | cut -d' ' -f1)
fi

if [ "$X" -eq 1 ]; then
    sudo iptables -I OUTPUT -d hiveminder.org -j DROP -m comment --comment hiveminder
fi

if [ "$X" -eq 2 ]; then
    sudo iptables -I OUTPUT -d hiveminder.org -j REJECT -m comment --comment hiveminder
fi

# if [ "$X" -eq 3 ]; then
# fi

set -x
sudo iptables -nL | grep hiveminder

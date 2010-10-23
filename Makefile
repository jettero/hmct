name=HiveminderCloudTasks
ssh=ssh -p 2222 -l root localhost
mydefser=TODO

default: test

release: clean
	env -i make --no-print-directory build
	git fetch github gh-pages:gh-pages
	x=$$(ls -1 *.ipk); mv -v $$x /tmp; git checkout gh-pages; mv -v /tmp/$$x .; git add *.ipk; git clean -dfx

test: clean
	@+HM_LOGLEVEL=99 make --no-print-directory build
	palm-install -d emulator *.ipk
	$(ssh) luna-send -n 1 palm://com.palm.applicationManager/launch "'{\"id\":\"org.voltar.hiveminder\"}'"
	$(ssh) tail -n 1000 -f /var/log/messages | ./log-parse.pl

lc logcontinue cl continuelog:
	$(ssh) tail -n 0 -f /var/log/messages | ./log-parse.pl -ca

flc freshlogcontinue:
	cat /dev/null > last_run.log
	@+ make --no-print-directory lc

myinstall: clean
	@+HM_LOGLEVEL=0 HM_DEFSER='$(mydefser)' env -u HM_UNFOLD -u HM_PRETAP -u HM_MAXAGE make --no-print-directory build
	scp *.ipk $${INSTHOST:-castle.vhb}:
	ssh $${INSTHOST:-castle.vhb} /usr/bin/ipkg -o /media/cryptofs/apps install *.ipk

myinstall-usb: clean
	@+HM_LOGLEVEL=0 HM_DEFSER='$(mydefser)' env -u HM_UNFOLD -u HM_PRETAP -u HM_MAXAGE make --no-print-directory build
	palm-install -d castle-linux *.ipk

newenvvars:
	if [ -f envvars ]; then \
        set | grep ^HM_ | sort > $@; \
        m1=$$(md5sum $@); m2=$$(md5sum envvars); \
        if [ "$$m1" = "$$m2" ]; then rm $@; else mv $@ envvars; fi \
	fi

envvars:
	set | grep ^HM_ | sort > $@

%.json: %.json.in newenvvars envvars
	@echo build $@
	@./JSON_preparser.pl $< > $@

ri remake-ins:
	@+for i in *.json.in; do x=`echo $$i|sed s/.in$$//`; touch $$i; make --no-print-directory $$x; done 

README: app/views/About.html app/views/Help.html Makefile
	@ echo -----=: app/views/About.html  > README
	@ elinks -dump app/views/About.html >> README
	@ echo                              >> README
	@ echo -----=: app/views/Help.html  >> README
	@ elinks -dump app/views/Help.html  >> README

build: framework_config.json runtime_options.json README
	@ # echo checking for version mismatch between appinfo.json and app/views/About.html
	@ # VV=`perl -ne 'print "$$1\n" if m/"?version"?:\s+"(.+?)",/' appinfo.json`; grep -q "\\<$$VV\\>" app/views/About.html
	@-rm -vf *.ipk $(name) *.tar.gz ipkgtmp*
	ln -sf ./ $(name) && \
        palm-package --exclude "*.tar.gz" --exclude .git --exclude cgi --exclude "*.ipk" \
                     --exclude $(name) --exclude contrib --exclude Makefile \
                     --exclude framework_config.json.in --exclude notes.txt \
                     --exclude yml --exclude envvars --exclude newenvvars \
                     $$(ls -1 *.sh *.pl *.in | sed -e 's/^/--exclude /') \
        $(name) && rm $(name)

clean:
	git clean -dfx

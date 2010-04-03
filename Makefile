name=HiveminderCloudTasks
ssh=ssh -p 2222 -l root localhost

default: test

test: clean
	@+HM_LOGLEVEL=99 make --no-print-directory build
	palm-install *.ipk
	$(ssh) luna-send -n 1 palm://com.palm.applicationManager/launch "'{\"id\":\"org.voltar.hiveminder\"}'"
	$(ssh) tail -n 1000 -f /var/log/messages | ./log-parse.pl

myinstall: clean
	@+HM_LOGLEVEL=0 env -u HM_PRETAP -u HM_MAXAGE make --no-print-directory build
	scp *.ipk $${INSTHOST:-castle.vhb}:
	ssh $${INSTHOST:-castle.vhb} /usr/bin/ipkg -o /media/cryptofs/apps install *.ipk

%.json: %.json.in
	@echo build $@
	@./JSON_preparser.pl $< > $@

build: framework_config.json runtime_options.json
	@echo checking for version mismatch between appinfo.json and app/views/About.html
	@VV=`perl -ne 'print "$$1\n" if m/"?version"?:\s+"(.+?)",/' appinfo.json`; grep -q "\\<$$VV\\>" app/views/About.html
	@-rm -vf *.ipk $(name) *.tar.gz ipkgtmp*
	ln -sf ./ $(name) && \
        palm-package --exclude "*.tar.gz" --exclude .git --exclude cgi --exclude "*.ipk" \
                     --exclude $(name) --exclude contrib --exclude Makefile \
                     --exclude log-parse.pl --exclude JSON_preparser.pl \
                     --exclude framework_config.json.in --exclude notes.txt \
                     --exclude yml \
        $(name) && rm $(name)

clean:
	git clean -dfx

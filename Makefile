name=HiveminderCloudTasks
ssh=ssh -p 2222 -l root localhost

default: test

test: clean
	@+HM_LOGLEVEL=99 make --no-print-directory build
	palm-install *.ipk
	$(ssh) luna-send -n 1 palm://com.palm.applicationManager/launch "'{\"id\":\"org.voltar.hiveminder\"}'"
	$(ssh) tail -f /var/log/messages | ./log-parse.pl

myinstall: clean
	@+HM_LOGLEVEL=0 make --no-print-directory build
	scp *.ipk $${INSTHOST:-castle.vhb}:
	ssh $${INSTHOST:-castle.vhb}

framework_config.json: framework_config.json.in
	@echo build $@
	@perl -pe 's/\%([\w\d]+),([\w\d]+)\%/$$ENV{ "HM_$$1" }||$$2/eg' $< > $@

build: framework_config.json
	@echo checking for version mismatch between appinfo.json and app/views/About.html
	@VV=`perl -ne 'print "$$1\n" if m/"version":\s+"(.+?)",/' appinfo.json`; grep -q "\\<$$VV\\>" app/views/About.html
	@-rm -vf *.ipk $(name) *.tar.gz ipkgtmp*
	ln -sf ./ $(name) && \
        palm-package --exclude "*.tar.gz" --exclude .git --exclude cgi --exclude "*.ipk" \
                     --exclude $(name) --exclude contrib --exclude Makefile \
                     --exclude log-parse.pl \
        $(name) && rm $(name)

clean:
	git clean -dfx

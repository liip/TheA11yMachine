all:
	git clone https://github.com/validator/validator
	cd validator
	python build/build.py \
		--presets-file="resources/nu-presets.txt" \
		--follow-w3c-spec \
		--html5link=http://www.w3.org/html/wg/drafts/html/master/single-page.html \
		update dldeps build jar
	cp build/dist/vnu.jar ..

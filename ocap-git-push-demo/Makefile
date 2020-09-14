# BSDmakefile

.PHONY: all
all:
	yarn

.PHONY: test
test:
	node --trace-warnings delegate.js -v \
	  --issuer-key='http://127.0.0.1/ocaps/alice/keys/1' \
	  --root-file='ocaps/alice/caps/1' \
	  --root-url='http://127.0.0.1/ocaps/alice/caps/1' \
	  --user='http://127.0.0.1/ocaps/carol/info' \
	  --user-key='http://127.0.0.1/ocaps/carol/info' \
	  --capability-file='ocaps/carol/caps/1' \
	  --capability-url='http://127.0.0.1/ocaps/carol/caps/1' \
	  --branch-re='^refs/heads/(feature/trial|main)$$'

.PHONY: test-1
test-1:
	if node --trace-warnings invoke.js -v \
	  --root-url='http://127.0.0.1/ocaps/alice/caps/1' \
	  --capability-url='http://127.0.0.1/ocaps/carol/caps/1' \
	  --user='http://127.0.0.1/ocaps/carol/info' \
	  --user-key='http://127.0.0.1/ocaps/carol/keys/1' \
	  refs/heads/feature/trial ; \
	rc="$${?}"; actual=0; \
	printf '\nexit status: actual: %d  expected: %d\n\n' "$${rc}" "$${actual}" ; \
	[ "$${rc}" -eq "$${actual}" ] ; \
	then exit 0 ; else exit 1 ; fi


.PHONY: test-2
test-2:
	if node --trace-warnings invoke.js -v \
	  --root-url='http://127.0.0.1/ocaps/alice/caps/1' \
	  --capability-url='http://127.0.0.1/ocaps/carol/caps/1' \
	  --user='http://127.0.0.1/ocaps/carol/info' \
	  --user-key='http://127.0.0.1/ocaps/carol/keys/1' \
	  refs/heads/master ; \
	rc="$${?}"; actual=1; \
	printf '\nexit status: actual: %d  expected: %d\n\n' "$${rc}" "$${actual}" ; \
	[ "$${rc}" -eq "$${actual}" ] ; \
	then exit 0 ; else exit 1 ; fi


.PHONY: clean
clean:
	rm -r node_modules

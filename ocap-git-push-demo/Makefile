# Makefile

VERBOSE ?=

# issuer/user
ISSUER_DID = did:key:z6MkvRsV39xVQc8HevAQwCqEw18DwrEtzVLz8NJY15NtfMmD
USER_DID = did:key:z6MkqyrirHAq8Acicq1FyNJGd9R7D1DW7Q8A3v1qqZfP4pdY

# default URL is this repository
GIT_URL ?= git@github.com:bitmark-inc/gitpp.git

# default branches are used for test target below
#
# examples:
#
#   really commit to master:
#       make create-capability BRANCH_RE='^refs/heads/master$'
#
#   commit to a user home dir test-repo with a file clone
#       make create-capability GIT_URL="/home/${USER}/test-repo" BRANCH_RE='^refs/heads/master$'
#
# Notes:
#   1. single quote to avoid shell problem with $
#   2. no need for $$ as in line below ($$ is only Makefile internal)
BRANCH_RE ?= ^refs/heads/(feature/trial|main)$$

CAPABILITY_NAME != uuidgen
CAPABILITY_URL = urn:uuid:${CAPABILITY_NAME}
CAPABILITY_FILE = ocaps/capabilities.json
CAPABILITY_TARGET = ssh://${GIT_URL}?key=${ISSUER_DID}

SECRETS_FILE = ./demo-secrets.json
NEW_SECRETS_FILE = ocaps/secrets.json

# update js dependencies
.PHONY: all
all:
	yarn


# create a demo capability
.PHONY: create-capability
create-capability:
	node --trace-warnings create-capability.js ${VERBOSE} \
	  --issuer='${ISSUER_DID}' \
	  --issuer-key=0 \
	  --user='${USER_DID}' \
	  --user-key=0 \
	  --capability-file='${CAPABILITY_FILE}' \
	  --capability-url='${CAPABILITY_URL}' \
	  --secrets-file='${SECRETS_FILE}' \
	  --target='${CAPABILITY_TARGET}' \
	  --branch-re='${BRANCH_RE}'

# create a fresh key
.PHONY: new-secret
new-secret:
	node --trace-warnings new-secret.js ${VERBOSE} \
	  --secrets-file='${NEW_SECRETS_FILE}'



# run all tests
.PHONY: test
test: create-capability test-1 test-2


# test that allows access
.PHONY: test-1
test-1:
	rm -f tmp-signed-invocation
	node --trace-warnings sign-invocation.js ${VERBOSE} \
	  --capability-url='${CAPABILITY_URL}' \
	  --target='${CAPABILITY_TARGET}' \
	  --user='${USER_DID}' \
	  --secrets-file='${SECRETS_FILE}' \
	  --user-key=0 > tmp-signed-invocation

	if node < tmp-signed-invocation --trace-warnings invoke.js ${VERBOSE} \
	  --target='${CAPABILITY_TARGET}' \
	  refs/heads/feature/trial ; \
	rc="$${?}"; actual=0; \
	printf '\nexit status: actual: %d  expected: %d\n\n' "$${rc}" "$${actual}" ; \
	[ "$${rc}" -eq "$${actual}" ] ; \
	then exit 0 ; else exit 1 ; fi


# test that disallows access
.PHONY: test-2
test-2:
	rm -f tmp-signed-invocation
	node --trace-warnings sign-invocation.js ${VERBOSE} \
	  --capability-url='${CAPABILITY_URL}' \
	  --target='${CAPABILITY_TARGET}' \
	  --user='${USER_DID}' \
	  --secrets-file='${SECRETS_FILE}' \
	  --user-key=0 > tmp-signed-invocation

	if node < tmp-signed-invocation --trace-warnings invoke.js ${VERBOSE} \
	  --target='${CAPABILITY_TARGET}' \
	  refs/heads/master ; \
	rc="$${?}"; actual=1; \
	printf '\nexit status: actual: %d  expected: %d\n\n' "$${rc}" "$${actual}" ; \
	[ "$${rc}" -eq "$${actual}" ] ; \
	then exit 0 ; else exit 1 ; fi


.PHONY: clean
clean:
	rm -r node_modules

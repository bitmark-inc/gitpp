# Simple test of a pre-push hook

## Test the delecation and invocation

Install the dependencies

~~~
doas pkg install node yarn  # or use appropriate system pkg manager
make                        # just runs yarn
~~~

Run tests (using BSD or GNU make)

Build a sample capability and run two tests:
~~~
make test
~~~

Just build the capability:
~~~
make create-capability
~~~

Running individual tests
~~~
make test-1   # should show allowed: true
make test-2   # should show allowed: false
~~~

## Check the push hook

Create some demo capabilities:
~~~
rm ocaps/capabilities.json
make create-capability GIT_URL=${HOME}/testrepos/server BRANCH_RE='^refs/heads/feature/.*$'
make create-capability GIT_URL=${HOME}/testrepos/server BRANCH_RE='^refs/heads/master$'
~~~

Create the data files: (XDG style)
~~~
mkdir "${XDG_CONFIG_HOME}/gitpp"
cp -p demo.secrets.json "${XDG_CONFIG_HOME}/gitpp/secrets.json"
cp -p ocaps/capabilities.json "${XDG_CONFIG_HOME}/gitpp/capabilities.json"
~~~
Or: for non-freedesktop.org desktops (old style)
~~~
mkdir "${HOME}.gitpp"
cp -p demo.secrets.json "${HOME}.gitpp/secrets.json"
cp -p ocaps/capabilities.json "${HOME}.gitpp/capabilities.json"
~~~

OPTIONAL: If GUI dialogs are wanted install zenity (BSD/Linux)
~~~
doas pkg install zenity
~~~

make test repo and install the hook:
~~~
mkdir ${HOME}/testrepos/
cd ${HOME}/testrepos/
git init --bare server
git clone server client

cd client
sh /PATH/TO/THIS/DIR/install-hooks.sh
~~~

Now make branches and commits on them

In the same test repo make some commits
to various branches. The created capabilities
only permits pushes to: `feature/trial` or `main`
and _not_ to branches like `production`

~~~
git push production
# push will be aborted
~~~

~~~
git push feature/trial
# success - with an option to abort (demos shell read with /dev/tty)
~~~

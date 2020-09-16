# Simple test of a pre-push hook

## Test the delecation and invocation

Install the dependencies

~~~
doas pkg install node yarn  # or use appropriate system pkg manager
make                        # just runs yarn
~~~

Run tests (using BSD or GNU make)

Build capability:
~~~
make create-capability
~~~

Check invocation of delegated capability
~~~
make test-1   # should show allowed: true
make test-2   # should show allowed: false
              # OR:
make test     # run both tests
~~~

## Check the push hook

Install the hook:

~~~
cd /PATH/TO/SOME/TEST/GIT/REPO
sh /PATH/TO/THIS/DIR/install-hooks.sh
~~~

In the same test repo make some commits
to various branches. The created capability
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

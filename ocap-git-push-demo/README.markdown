# Simple test of a pre-push hook

## Set up local web server

For nginx you need to be able to alias /ocaps to the ocaps directory

e.g.:

~~~
    location /ocaps {
        alias /PATH/TO/THIS/DIR/ocaps;
        access_log off;
        log_not_found off;
        autoindex on;
    }
~~~

To test that nginx is configured correctly:
~~~
curl http://127.0.0.1/ocaps/alice/info | jq .
~~~

## Test the delecation and invocation

Install the dependencies

~~~
doas pkg install node yarn  # or use appropriate system pkg manager
make                        # just runs yarn
~~~

Run tests (using BSD or GNU make)

Rebuild root and delegated capabilities:
~~~
make test
~~~

Check invocation of delegated capability
~~~
make test-1
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

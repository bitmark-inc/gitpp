#!/bin/sh
# install hooks to current directory

src_dir="$(dirname "${0}")"
dst_dir="${PWD}"

hook_dir="${src_dir}/git-hooks"
caps_dir="${src_dir}/ocaps"

USAGE() {
  if [ -n "${1}" ]
  then
    printf 'error: '
    printf "${@}"
    printf '\n'
  fi
  printf 'usage: %s\n' "$(basename "${0}")"
  exit 2
}

# main program
[ -d "${dst_dir}/git-hooks" ] && USAGE 'run in the destination repository not: %s' "${dst_dir}"
[ -d "${hook_dir}" ] || USAGE 'cannot locate hook source dir: %' "${hook_dir}"
[ -d "${caps_dir}" ] || USAGE 'cannot locate capability dir: %' "${caps_dir}"

hook_dst="${dst_dir}/.git/hooks"
[ -d "${hook_dst}" ] || USAGE 'the destination repository: %s  is not a git repository' "${dst_dir}"

for s in "${hook_dir}"/*
do
  bn="$(basename "${s}")"
  d="${hook_dst}/${bn}"
  printf 'installing: %s to: %s\n' "${s}" "${d}"
  sed "s,@@JS_DIR@@,${src_dir},g" "${s}" > "${d}"
  chmod 755 "${d}"
done

# check that notes it set to be fetched


if git config --get-all remote.origin.fetch | grep -q 'notes'
then
  printf 'remote.origin.fetch for notes is already present in .git/config\n'
else
  printf 'adding remote.origin.fetch for notes to .git/config\n'
  git config --add remote.origin.fetch '+refs/notes/*:refs/notes/*'
fi

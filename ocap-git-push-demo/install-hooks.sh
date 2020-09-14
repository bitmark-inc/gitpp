#!/bin/sh
# install hooks to current directory

src_dir="$(dirname "${0}")"
dst_dir="${PWD}"

hook_dir="${src_dir}/git-hooks"

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

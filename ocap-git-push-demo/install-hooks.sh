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

capability_list=$(ls -1 "${caps_dir}"/*.cap | \
  while read file
  do
    [ ! -f "${file}" ] && continue
    [ X"${file}" = X"${file%.cap}" ] && continue
    file="cap:$(basename "${file}")"
    printf '%s ' "${file}"
  done)

for s in "${hook_dir}"/*
do
  bn="$(basename "${s}")"
  d="${hook_dst}/${bn}"
  printf 'installing: %s to: %s\n' "${s}" "${d}"
  sed "s,@@JS_DIR@@,${src_dir},g;s,@@CAPABILITY@@,${capability_list},g" "${s}" > "${d}"
  chmod 755 "${d}"
done

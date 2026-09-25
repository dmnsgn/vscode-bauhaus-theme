#!/bin/sh
# Print the 16 ANSI colors as text and as backgrounds.
for style in 3 9; do
  for n in 0 1 2 3 4 5 6 7; do printf "\033[${style}${n}m %-8s\033[0m" "$style$n"; done; echo
done
for n in 0 1 2 3 4 5 6 7; do printf "\033[4${n}m %-8s\033[0m" "4$n"; done; echo
